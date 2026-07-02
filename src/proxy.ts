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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (startsWithRoute(pathname, customerRoutes) && !hasScopedCookie(request, customerAuthCookie)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    pathname !== "/admin/login" &&
    !hasScopedCookie(request, adminAuthCookie)
  ) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
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
