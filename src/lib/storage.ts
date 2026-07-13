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

function isDirectAssetPath(path: string) {
  return path.startsWith("/") || path.startsWith("http://") || path.startsWith("https://");
}

export async function signedUrls(
  bucket: string,
  paths: string[],
  scope: AuthScope = "customer",
) {
  const results = new Map<string, string>();
  const storagePaths: string[] = [];

  for (const path of paths) {
    if (isDirectAssetPath(path)) results.set(path, path);
    else storagePaths.push(path);
  }

  if (storagePaths.length === 0) return results;

  const supabase = await createSupabaseServerClient(scope);
  const { data } = await supabase.storage.from(bucket).createSignedUrls(storagePaths, 900);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) results.set(item.path, item.signedUrl);
  }
  return results;
}
