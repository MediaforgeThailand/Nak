import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
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

export async function requireApprovedProfile() {
  const { user, profile } = await getCurrentProfile();

  if (!user) redirect("/login");
  if (!profile || profile.status !== "approved") redirect("/pending");

  return { user, profile };
}

export async function requireCustomer() {
  const session = await requireApprovedProfile();
  if (session.profile.role !== "customer") redirect("/admin");
  return session;
}

export async function requireStaff() {
  const session = await requireApprovedProfile();
  if (!["admin", "factory_staff"].includes(session.profile.role)) {
    redirect("/dashboard");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireApprovedProfile();
  if (session.profile.role !== "admin") redirect("/admin");
  return session;
}

export function landingForProfile(profile: Profile | null) {
  if (!profile || profile.status !== "approved") return "/pending";
  if (profile.role === "admin" || profile.role === "factory_staff") {
    return "/admin";
  }
  return "/dashboard";
}
