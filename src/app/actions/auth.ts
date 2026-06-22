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
  const origin = headersList.get("origin");
  if (origin) return origin;

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3001";
}

function formScope(formData: FormData): AuthScope {
  return formData.get("scope") === "admin" ? "admin" : "customer";
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
      signup_scope: scope === "admin" ? "staff" : "customer",
    })
    .eq("id", user.id)
    .eq("status", "pending");

  if (error) {
    redirect(`/pending?scope=${scope}&error=${encodeURIComponent(error.message)}`);
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
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  const profile = await getSignedInProfile(supabase);
  if (!profile || profile.status !== "approved") redirect("/pending?scope=customer");
  if (profile.role !== "customer") {
    await supabase.auth.signOut();
    redirect("/login?error=บัญชีนี้ไม่ใช่บัญชีลูกค้า กรุณาเข้าสู่ระบบผ่านหน้า Admin");
  }

  redirect("/home");
}

export async function signInWithLineAction() {
  const supabase = await createSupabaseServerClient("customer");
  const headersList = await headers();
  const origin = getRequestOrigin(headersList);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "custom:line",
    options: {
      redirectTo: `${origin}/auth/callback?scope=customer`,
    },
  });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);

  redirect(`/login?error=${encodeURIComponent("ไม่สามารถเปิด LINE Login ได้")}`);
}

export async function signInAdminAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient("admin");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/admin/login?error=${encodeURIComponent(error.message)}`);

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

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
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

  if (error) redirect(`/admin/login?mode=signup&error=${encodeURIComponent(error.message)}`);
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
