import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/env";

export type AuthScope = "customer" | "admin";

const authCookieNames: Record<AuthScope, string> = {
  customer: "nak-customer-auth-token",
  admin: "nak-admin-auth-token",
};

export async function createSupabaseServerClient(scope: AuthScope = "customer") {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient(url, key, {
    cookieOptions: {
      name: authCookieNames[scope],
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Server Actions and Route Handlers can.
        }
      },
    },
  });
}
