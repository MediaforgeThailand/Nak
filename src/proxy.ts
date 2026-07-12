import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const customerAuthCookie = "nak-customer-auth-token";
const adminAuthCookie = "nak-admin-auth-token";

const customerRoutes = [
  "/cart",
  "/dashboard",
  "/home",
  "/orders",
  "/payments",
  "/price-program",
  "/products",
  "/profile",
  "/transactions",
];

function hasScopedCookie(request: NextRequest, cookieName: string) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name === cookieName || cookie.name.startsWith(`${cookieName}.`));
}

function startsWithRoute(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

// Refresh the Supabase session for the given cookie scope so long-idle users
// (common inside the LINE in-app browser) don't bounce to /login with an
// expired token: Server Components can't persist refreshed cookies, so the
// proxy is the one place the refreshed token reliably reaches the browser.
async function refreshSession(request: NextRequest, cookieName: string) {
  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookieOptions: { name: cookieName },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Triggers a token refresh when the access token has expired.
  await supabase.auth.getUser();
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (startsWithRoute(pathname, customerRoutes)) {
    if (!hasScopedCookie(request, customerAuthCookie)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return refreshSession(request, customerAuthCookie);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname !== "/admin/login" && !hasScopedCookie(request, adminAuthCookie)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (hasScopedCookie(request, adminAuthCookie)) {
      return refreshSession(request, adminAuthCookie);
    }
  }

  // Pending users idle on /pending and reload it while waiting for approval —
  // refresh whichever scoped session is present so the reload doesn't trip
  // refresh-token reuse detection and log them out.
  if (pathname === "/pending") {
    const scope = request.nextUrl.searchParams.get("scope");
    if (scope === "admin" && hasScopedCookie(request, adminAuthCookie)) {
      return refreshSession(request, adminAuthCookie);
    }
    if (hasScopedCookie(request, customerAuthCookie)) {
      return refreshSession(request, customerAuthCookie);
    }
    if (hasScopedCookie(request, adminAuthCookie)) {
      return refreshSession(request, adminAuthCookie);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/pending",
    "/cart/:path*",
    "/dashboard/:path*",
    "/home/:path*",
    "/orders/:path*",
    "/payments/:path*",
    "/price-program/:path*",
    "/products/:path*",
    "/profile/:path*",
    "/transactions/:path*",
    "/admin/:path*",
  ],
};
