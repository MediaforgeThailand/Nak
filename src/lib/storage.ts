import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthScope } from "@/lib/supabase/server";

export function safeFileName(name: string) {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || "upload";
}

export async function signedUrl(
  bucket: string,
  path: string | null | undefined,
  scope: AuthScope = "customer",
) {
  if (!path) return null;
  const supabase = await createSupabaseServerClient(scope);
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 900);
  return data?.signedUrl ?? null;
}

export async function signedUrls(
  bucket: string,
  paths: string[],
  scope: AuthScope = "customer",
) {
  const supabase = await createSupabaseServerClient(scope);
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 900);
  return new Map((data ?? []).map((item) => [item.path, item.signedUrl]));
}
