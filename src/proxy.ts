// ---------------------------------------------------------------------------
// Edge Middleware — auth guard for admin UI and API routes
// ---------------------------------------------------------------------------
// - Protects all /(admin) pages → redirects to /login if not authenticated
// - Protects /api/ routes → returns 401 if not authenticated
// - Skips /api/auth/* and /api/internal/* (these use other auth mechanisms)
// - If ADMIN_PASSWORD is not set, auth is disabled (dev mode)

import { NextResponse, NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/internal/sku-sync",
  "/api/settings/erp-test",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // If no ADMIN_PASSWORD is set, allow everything (dev mode)
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("rea3_session")?.value;
  const isValid = sessionCookie ? await verifyToken(sessionCookie) : null;

  // API routes: return 401 if no valid session
  if (pathname.startsWith("/api/")) {
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Admin UI routes: redirect to login if no valid session
  if (!isValid) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all admin and API routes except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
