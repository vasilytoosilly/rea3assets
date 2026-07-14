// ---------------------------------------------------------------------------
// Edge Middleware — auth guard for admin UI and API routes
// ---------------------------------------------------------------------------
// - Protects all /(admin) pages → redirects to /login if not authenticated
// - Protects /api/ routes → returns 401 if not authenticated
// - Skips /api/auth/* and /api/internal/* (these use other auth mechanisms)
// - If ADMIN_PASSWORD is not set, auth is disabled (dev mode)
//
// Exported as `proxy` AND `middleware` — Next.js App Router detects the
// `middleware` named export. The `proxy` alias is kept for backward compat
// with any internal imports.
// ---------------------------------------------------------------------------

import { NextResponse, NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth-edge";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/health",
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/internal/sku-sync",
  "/marketplace",
  "/api/marketplace",
  "/api/files",
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

  // Only bypass auth when ADMIN_PASSWORD is unset AND we're in development
  if (!process.env.ADMIN_PASSWORD) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.next();
    }
    // In production without a password, block everything to be safe
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized — ADMIN_PASSWORD not configured" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
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

// Next.js App Router middleware — must be a named export called `middleware`
export { proxy as middleware };

export const config = {
  matcher: [
    // Match all admin and API routes except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
