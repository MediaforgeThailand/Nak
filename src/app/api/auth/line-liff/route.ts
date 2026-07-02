import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/env";

const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

// LINE users have no email, so we give them a deterministic synthetic one. This lets
// us mint a Supabase session via magic-link OTP and stays stable across logins.
function syntheticEmailFor(lineUserId: string) {
  return `${lineUserId.toLowerCase()}@line.nak.local`;
}

// Reuse the same Supabase user the web OAuth flow created, matched by the LINE
// userId stored in user_metadata.sub (falling back to the synthetic email).
async function findUserId(admin: SupabaseClient, sub: string, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find(
      (u) => u.user_metadata?.sub === sub || u.email?.toLowerCase() === email,
    );
    if (match) return match.id;
    if (data.users.length < 200) break;
  }
  return null;
}

export async function POST(request: Request) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!channelId || !serviceKey) {
    return NextResponse.json({ error: "LINE login is not configured" }, { status: 500 });
  }

  let idToken = "";
  let requestedScope: "customer" | "admin" = "customer";
  try {
    const body = await request.json();
    idToken = String(body?.idToken ?? "");
    if (body?.scope === "admin") requestedScope = "admin";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  // 1) Verify the LIFF id_token directly with LINE (no web redirect → works in the
  //    iOS in-app browser that drops cookies during the OAuth bounce).
  const verifyRes = await fetch(LINE_VERIFY_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  if (!verifyRes.ok) {
    return NextResponse.json({ error: "LINE token verification failed" }, { status: 401 });
  }
  const claims = (await verifyRes.json()) as { sub?: string; name?: string; picture?: string };
  const lineUserId = claims.sub;
  if (!lineUserId) {
    return NextResponse.json({ error: "LINE token missing subject" }, { status: 401 });
  }

  const { url } = getSupabaseEnv();
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2) Map the LINE identity to a Supabase user (create on first login).
  const email = syntheticEmailFor(lineUserId);
  let userId = await findUserId(admin, lineUserId, email);
  if (userId) {
    // Ensure the synthetic email is present so OTP minting works.
    await admin.auth.admin.updateUserById(userId, { email, email_confirm: true });
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { sub: lineUserId, name: claims.name, picture: claims.picture },
    });
    if (createErr || !created.user) {
      return NextResponse.json({ error: "Could not create account" }, { status: 500 });
    }
    userId = created.user.id;
  }

  // Keep the LINE userId on the profile for future push notifications.
  await admin.from("profiles").update({ line_user_id: lineUserId }).eq("id", userId);

  // 3) Pick the auth scope from the role so the right cookie is set.
  const { data: profile } = await admin
    .from("profiles")
    .select("role, status")
    .eq("id", userId)
    .single<{ role: string; status: string }>();

  const isStaff = profile?.role === "admin" || profile?.role === "factory_staff";
  // Honor the page the login started from: admins may use the customer side too
  // (separate cookie per side). Factory staff belong to the admin side only, and
  // plain customers never get an admin-scope session.
  const scope =
    requestedScope === "customer"
      ? profile?.role === "factory_staff"
        ? "admin"
        : "customer"
      : isStaff
        ? "admin"
        : "customer";

  // 4) Mint a session via magic-link OTP and let the scoped SSR client set the cookie.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const otp = linkData?.properties?.email_otp;
  if (linkErr || !otp) {
    return NextResponse.json({ error: "Could not start session" }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient(scope);
  const { error: otpErr } = await supabase.auth.verifyOtp({ email, token: otp, type: "magiclink" });
  if (otpErr) {
    return NextResponse.json({ error: "Could not establish session" }, { status: 500 });
  }

  let redirect = scope === "admin" ? "/admin/home" : "/home";
  if (!profile || profile.status !== "approved") {
    redirect = `/pending?scope=${scope}`;
  }

  return NextResponse.json({ redirect });
}
