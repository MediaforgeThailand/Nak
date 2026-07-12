"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthScope } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

async function getSignedInProfile(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return profile ?? null;
}

function getRequestOrigin(headersList: Headers) {
  // 1) Explicit, stable public URL — set NEXT_PUBLIC_SITE_URL on Vercel so the
  //    OAuth redirect always points at the right domain (never localhost).
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  // 2) The Origin header (present on server-action POSTs from the browser).
  const origin = headersList.get("origin");
  if (origin) return origin;

  // 3) Reconstruct from the forwarded host when running behind a proxy.
  const forwardedHost = headersList.get("x-forwarded-host") ?? headersList.get("host");
  if (forwardedHost) {
    const proto = headersList.get("x-forwarded-proto") ?? "https";
    return `${proto}://${forwardedHost}`;
  }

  // 4) Vercel deployment URL as a last resort before local dev.
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function formScope(formData: FormData): AuthScope {
  return formData.get("scope") === "admin" ? "admin" : "customer";
}

// Supabase Auth returns English messages; map the common ones to Thai so the
// UI stays consistent. Unknown messages fall through unchanged.
function authErrorMessage(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (m.includes("email not confirmed")) return "อีเมลนี้ยังไม่ได้ยืนยัน";
  if (m.includes("already registered") || m.includes("already been registered")) return "อีเมลนี้ถูกใช้สมัครแล้ว";
  if (m.includes("password should be at least")) return "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "รูปแบบอีเมลไม่ถูกต้อง";
  if (m.includes("rate limit") || m.includes("too many requests")) return "พยายามหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง";
  return message;
}

function metadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function updatePendingProfileAction(formData: FormData) {
  const scope = formScope(formData);
  const supabase = await createSupabaseServerClient(scope);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(scope === "admin" ? "/admin/login" : "/login");

  const profile = await getSignedInProfile(supabase);
  if (!profile) redirect(`/pending?scope=${scope}&error=${encodeURIComponent("ไม่พบบัญชีผู้ใช้งาน")}`);
  if (profile.status !== "pending") redirect(scope === "admin" ? "/admin/home" : "/home");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) {
    redirect(`/pending?scope=${scope}&error=${encodeURIComponent("กรุณากรอกชื่อผู้ติดต่อ")}`);
  }

  const metadata = user.user_metadata as Record<string, unknown>;
  const identity = user.identities?.find((item) => item.provider.toLowerCase().includes("line"));
  const lineUserId = metadataString(metadata, ["sub", "provider_id", "user_id"]) ?? identity?.id ?? null;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      company_name: companyName || null,
      phone: phone || null,
      line_user_id: lineUserId,
    })
    .eq("id", user.id)
    .eq("status", "pending");

  if (error) {
    redirect(`/pending?scope=${scope}&error=${encodeURIComponent(error.message)}`);
  }

  // Direct signup_scope writes are pinned by the privilege trigger — the
  // staff-request flag moves only through its dedicated RPCs.
  const wantsStaff = scope === "admin";
  const scopeRpc = wantsStaff
    ? profile.signup_scope !== "staff"
      ? "request_staff_access"
      : null
    : profile.signup_scope === "staff"
      ? "revoke_staff_request"
      : null;
  if (scopeRpc) {
    const { error: scopeError } = await supabase.rpc(scopeRpc);
    if (scopeError) {
      redirect(`/pending?scope=${scope}&error=${encodeURIComponent("บันทึกข้อมูลแล้ว แต่ส่งคำขอสิทธิ์ไม่สำเร็จ กรุณาลองใหม่")}`);
    }
  }

  revalidatePath("/pending");
  revalidatePath("/admin/users");
  redirect(`/pending?scope=${scope}&saved=1`);
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient("customer");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(authErrorMessage(error.message))}&email=${encodeURIComponent(email)}`);
  }

  const profile = await getSignedInProfile(supabase);
  if (!profile || profile.status !== "approved") redirect("/pending?scope=customer");
  // Admins are allowed on the customer side too (for testing); only block other roles.
  if (profile.role !== "customer" && profile.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/login?error=บัญชีนี้ไม่ใช่บัญชีลูกค้า กรุณาเข้าสู่ระบบผ่านหน้า Admin");
  }

  redirect("/home");
}

async function startLineOAuth(scope: AuthScope) {
  const supabase = await createSupabaseServerClient(scope);
  const headersList = await headers();
  const origin = getRequestOrigin(headersList);
  const loginPath = scope === "admin" ? "/admin/login" : "/login";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "custom:line",
    options: {
      redirectTo: `${origin}/auth/callback?scope=${scope}`,
    },
  });

  if (error) redirect(`${loginPath}?error=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);

  redirect(`${loginPath}?error=${encodeURIComponent("ไม่สามารถเปิด LINE Login ได้")}`);
}

export async function signInWithLineAction() {
  await startLineOAuth("customer");
}

export async function signInWithLineAdminAction() {
  await startLineOAuth("admin");
}

export async function signInAdminAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient("admin");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent(authErrorMessage(error.message))}&email=${encodeURIComponent(email)}`);
  }

  const profile = await getSignedInProfile(supabase);
  if (!profile || profile.status !== "approved") redirect("/pending?scope=admin");
  if (!["admin", "factory_staff"].includes(profile.role)) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=บัญชีนี้ไม่ใช่บัญชีทีมงาน กรุณาเข้าสู่ระบบผ่านหน้าลูกค้า");
  }

  redirect("/admin/home");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const supabase = await createSupabaseServerClient("customer");
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName,
        phone,
      },
    },
  });

  if (error) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent(authErrorMessage(error.message))}&email=${encodeURIComponent(email)}`,
    );
  }
  redirect("/pending?scope=customer");
}

export async function signUpStaffAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const supabase = await createSupabaseServerClient("admin");
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName || "ทีมงาน",
        phone,
        account_scope: "staff",
      },
    },
  });

  if (error) {
    redirect(
      `/admin/login?mode=signup&error=${encodeURIComponent(authErrorMessage(error.message))}&email=${encodeURIComponent(email)}`,
    );
  }
  redirect("/pending?scope=admin");
}

export async function signOutCustomerAction() {
  const supabase = await createSupabaseServerClient("customer");
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signOutAdminAction() {
  const supabase = await createSupabaseServerClient("admin");
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export { signOutCustomerAction as signOutAction };
