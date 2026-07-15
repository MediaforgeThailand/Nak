import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, type AuthScope } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

function callbackError(request: NextRequest, scope: AuthScope, message: string) {
  const path = scope === "admin" ? "/admin/login" : "/login";
  const url = new URL(path, request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

// THROWAWAY diagnostic — the web-OAuth twin of the LIFF beacon. Logs why the
// iOS in-app/Safari OAuth bounce lands back on /login. Remove with _liff-debug.
function logCb(data: Record<string, unknown>) {
  console.log("[oauth-callback]", JSON.stringify(data));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const scope: AuthScope = requestUrl.searchParams.get("scope") === "admin" ? "admin" : "customer";
  const ua = request.headers.get("user-agent") ?? "";
  // The PKCE verifier cookie is what iOS tends to drop; seeing whether it is
  // present at callback time tells us if that is the failure.
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
    return callbackError(request, scope, error.message);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logCb({ stage: "no-user-after-exchange", scope, ua, cookieNames });
    return callbackError(request, scope, "ไม่พบข้อมูลผู้ใช้งาน");
  }

  logCb({ stage: "session-ok", scope, ua, userId: user.id });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // Logging in on the backend with a non-staff account registers a staff-access
  // request (marked via signup_scope) instead of being rejected outright.
  if (scope === "admin" && profile && profile.role === "customer" && profile.signup_scope !== "staff") {
    await supabase.from("profiles").update({ signup_scope: "staff" }).eq("id", user.id);
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

  if (profile.role !== "customer") {
    await supabase.auth.signOut();
    return callbackError(request, scope, "บัญชีนี้ไม่ใช่บัญชีลูกค้า");
  }

  return NextResponse.redirect(new URL("/home", request.url));
}
