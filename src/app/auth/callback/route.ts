import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, type AuthScope } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

function callbackError(request: NextRequest, scope: AuthScope, message: string) {
  const path = scope === "admin" ? "/admin/login" : "/login";
  const url = new URL(path, request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const scope: AuthScope = requestUrl.searchParams.get("scope") === "admin" ? "admin" : "customer";

  if (!code) {
    return callbackError(request, scope, "ไม่พบรหัสยืนยันการเข้าสู่ระบบ");
  }

  const supabase = await createSupabaseServerClient(scope);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return callbackError(request, scope, error.message);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return callbackError(request, scope, "ไม่พบข้อมูลผู้ใช้งาน");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || profile.status !== "approved") {
    return NextResponse.redirect(new URL(`/pending?scope=${scope}`, request.url));
  }

  if (scope === "admin") {
    if (!["admin", "factory_staff"].includes(profile.role)) {
      await supabase.auth.signOut();
      return callbackError(request, scope, "บัญชีนี้ไม่มีสิทธิ์เข้าหลังบ้าน");
    }

    return NextResponse.redirect(new URL("/admin/home", request.url));
  }

  if (profile.role !== "customer") {
    await supabase.auth.signOut();
    return callbackError(request, scope, "บัญชีนี้ไม่ใช่บัญชีลูกค้า");
  }

  return NextResponse.redirect(new URL("/home", request.url));
}
