import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";

// Server-only helpers for the LINE Official Account Messaging API.
// The OA channel access token and channel secret live in server env only.

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export function getLineToken() {
  return process.env.LINE_OA_ACCESS_TOKEN ?? "";
}

export function getLineChannelSecret() {
  return process.env.LINE_CHANNEL_SECRET ?? "";
}

/** Service-role Supabase client for system workers (bypasses RLS). */
export function lineServiceClient(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  const { url } = getSupabaseEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Verify a LINE webhook body against the x-line-signature header. */
export function verifyLineSignature(rawBody: string, signature: string | null) {
  const secret = getLineChannelSecret();
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  // Length-safe compare.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Push a plain-text message to a LINE user/group/room. Returns ok + error text. */
export async function pushLineText(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const token = getLineToken();
  if (!token) return { ok: false, error: "LINE_OA_ACCESS_TOKEN is not set" };
  if (!to) return { ok: false, error: "No recipient (group not linked yet)" };

  try {
    const res = await fetch(LINE_PUSH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, messages: [{ type: "text", text: text.slice(0, 4900) }] }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `LINE push failed (${res.status}): ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "LINE push error" };
  }
}

const GROUP_SETTING_KEY = "line_group_id";

/** Read the linked staff-group id captured by the webhook (or null). */
export async function getLinkedGroupId(client: SupabaseClient): Promise<string | null> {
  const { data } = await client.from("app_settings").select("value").eq("key", GROUP_SETTING_KEY).maybeSingle<{ value: { id?: string } }>();
  return data?.value?.id ?? null;
}

/** Store/replace the linked staff-group id. */
export async function setLinkedGroupId(client: SupabaseClient, groupId: string | null) {
  await client.from("app_settings").upsert(
    {
      key: GROUP_SETTING_KEY,
      value: groupId ? { id: groupId } : {},
      description: "LINE staff group that receives OA notifications (captured via webhook)",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
}
