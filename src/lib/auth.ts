import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthScope } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

const loginPath: Record<AuthScope, string> = {
  customer: "/login",
  admin: "/admin/login",
};

export async function getCurrentProfile(scope: AuthScope = "customer") {
  const supabase = await createSupabaseServerClient(scope);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return { user, profile };
}

export async function requireApprovedProfile(scope: AuthScope = "customer") {
  const { user, profile } = await getCurrentProfile(scope);

  if (!user) redirect(loginPath[scope]);
  if (!profile || profile.status !== "approved") redirect(`/pending?scope=${scope}`);

  return { user, profile };
}

export async function requireCustomer() {
  const session = await requireApprovedProfile("customer");
  // Admins may also use the customer side (e.g. to test customer flows).
  if (session.profile.role !== "customer" && session.profile.role !== "admin") {
    redirect("/login?error=กรุณาเข้าสู่ระบบด้วยบัญชีลูกค้า");
  }
  return session;
}

export async function requireStaff() {
  const session = await requireApprovedProfile("admin");
  if (!["admin", "factory_staff"].includes(session.profile.role)) {
    redirect("/admin/login?error=กรุณาเข้าสู่ระบบด้วยบัญชีทีมงาน");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireApprovedProfile("admin");
  if (session.profile.role !== "admin") redirect("/admin/home");
  return session;
}

export async function requireOwner() {
  const session = await requireAdmin();
  if (!session.profile.is_owner) redirect("/admin/home");
  return session;
}

export function landingForProfile(profile: Profile | null) {
  if (!profile || profile.status !== "approved") return "/pending";
  if (profile.role === "admin" || profile.role === "factory_staff") {
    return "/admin/home";
  }
  return "/home";
}
