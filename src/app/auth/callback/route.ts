import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, type AuthScope } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

function callbackError(request: NextRequest, scope: AuthScope, message: string) {
  const path = scope === "admin" ? "/admin/login" : "/login";
  const url = new URL(path, request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

// THROWAWAY diagnostic — the web-OAuth twin of the LIFF beacon. Reports why a
// LINE sign-in that succeeded on LINE's side fails to become a session here.
// Remove together with the liff-debug beacon.
function logCb(data: Record<string, unknown>) {
  console.log("[oauth-callback]", JSON.stringify(data));
}

// LINE authenticated the user, but we could not establish a session here.
// Instead of dumping them on a raw /login error — which reads as "login
// failed" — send them to the pending page, which offers a one-tap retry.
function gracefulLanding(request: NextRequest, scope: AuthScope) {
  const url = new URL("/pending", request.url);
  url.searchParams.set("scope", scope);
  url.searchParams.set("auth", "line-incomplete");
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const scope: AuthScope = requestUrl.searchParams.get("scope") === "admin" ? "admin" : "customer";
  const ua = request.headers.get("user-agent") ?? "";
  // The PKCE verifier cookie is the usual suspect on iOS; whether it is present
  // at callback time tells us if that is what broke.
  const cookieNames = request.cookies.getAll().map((c) => c.name);

  if (!code) {
    logCb({
      stage: "no-code",
      scope,
      ua,
      cookieNames,
      oauthError: requestUrl.searchParams.get("error"),
      oauthErrorDesc: requestUrl.searchParams.get("error_description"),
    });
    return callbackError(request, scope, "ไม่พบรหัสยืนยันการเข้าสู่ระบบ");
  }

  const supabase = await createSupabaseServerClient(scope);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logCb({
      stage: "exchange-failed",
      scope,
      ua,
      cookieNames,
      message: error.message,
      status: (error as { status?: number }).status ?? null,
    });
    return gracefulLanding(request, scope);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logCb({ stage: "no-user-after-exchange", scope, ua, cookieNames });
    return gracefulLanding(request, scope);
  }

  logCb({ stage: "session-ok", scope, ua, userId: user.id });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // Logging in on the backend with a non-staff account registers a staff-access
  // request. Direct signup_scope writes are blocked by the privilege trigger,
  // so this goes through the dedicated RPC.
  if (scope === "admin" && profile && profile.role === "customer" && profile.signup_scope !== "staff") {
    const { error: rpcError } = await supabase.rpc("request_staff_access");
    if (rpcError) {
      console.error("request_staff_access failed", rpcError);
      return callbackError(request, scope, "ส่งคำขอเป็นทีมงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
    profile.signup_scope = "staff";
  }

  if (!profile || profile.status !== "approved") {
    return NextResponse.redirect(new URL(`/pending?scope=${scope}`, request.url));
  }

  if (scope === "admin") {
    if (!["admin", "factory_staff"].includes(profile.role)) {
      // Approved customer asking for backend access → show the pending request page
      // (their staff request now appears in the admin "คำขอทีมงาน" list).
      return NextResponse.redirect(new URL("/pending?scope=admin", request.url));
    }

    return NextResponse.redirect(new URL("/admin/home", request.url));
  }

  // Admins may also sign in on the customer side (for testing); block other roles only.
  if (profile.role !== "customer" && profile.role !== "admin") {
    await supabase.auth.signOut();
    return callbackError(request, scope, "บัญชีนี้ไม่ใช่บัญชีลูกค้า");
  }

  return NextResponse.redirect(new URL("/home", request.url));
}
