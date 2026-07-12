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

async function pushLineMessages(to: string, messages: unknown[]): Promise<{ ok: boolean; error?: string }> {
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
      body: JSON.stringify({ to, messages }),
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

/** Push a plain-text message to a LINE user/group/room. Returns ok + error text. */
export async function pushLineText(to: string, text: string) {
  return pushLineMessages(to, [{ type: "text", text: text.slice(0, 4900) }]);
}

/** Push a Flex message (rich card UI). `contents` is a bubble or carousel object. */
export async function pushLineFlex(to: string, altText: string, contents: unknown) {
  return pushLineMessages(to, [{ type: "flex", altText: altText.slice(0, 390), contents }]);
}

/**
 * This month's push-message usage straight from LINE (authoritative — includes
 * messages sent outside this app). Returns null when the API can't be reached.
 */
export async function getLineQuota(): Promise<{ used: number; limit: number | null } | null> {
  const token = getLineToken();
  if (!token) return null;
  const headers = { authorization: `Bearer ${token}` };
  try {
    const [consRes, quotaRes] = await Promise.all([
      fetch("https://api.line.me/v2/bot/message/quota/consumption", { headers }),
      fetch("https://api.line.me/v2/bot/message/quota", { headers }),
    ]);
    if (!consRes.ok) return null;
    const cons = (await consRes.json()) as { totalUsage?: number };
    let limit: number | null = null;
    if (quotaRes.ok) {
      const quota = (await quotaRes.json()) as { type?: string; value?: number };
      limit = quota.type === "limited" && typeof quota.value === "number" ? quota.value : null;
    }
    return { used: Number(cons.totalUsage ?? 0), limit };
  } catch {
    return null;
  }
}

const GROUP_SETTING_KEY = "line_group_id";

export type GroupLinkState = { id: string | null; blocked: string | null };

/** Linked staff-group id plus the id blocked after an explicit admin unlink. */
export async function getGroupLinkState(client: SupabaseClient): Promise<GroupLinkState> {
  const { data } = await client
    .from("app_settings")
    .select("value")
    .eq("key", GROUP_SETTING_KEY)
    .maybeSingle<{ value: { id?: string; blocked?: string } }>();
  return { id: data?.value?.id ?? null, blocked: data?.value?.blocked ?? null };
}

/** Read the linked staff-group id captured by the webhook (or null). */
export async function getLinkedGroupId(client: SupabaseClient): Promise<string | null> {
  return (await getGroupLinkState(client)).id;
}

/**
 * Store/replace the linked staff-group id. Unlinking may pass `block` (the
 * just-unlinked id): chatter in that group can then no longer auto-relink it —
 * only a fresh join (deliberate re-invite) or a different group can.
 */
export async function setLinkedGroupId(
  client: SupabaseClient,
  groupId: string | null,
  options?: { block?: string | null },
) {
  await client.from("app_settings").upsert(
    {
      key: GROUP_SETTING_KEY,
      value: groupId ? { id: groupId } : options?.block ? { blocked: options.block } : {},
      description: "LINE staff group that receives OA notifications (captured via webhook)",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
}
