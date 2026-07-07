import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// POST /api/auth/login  → verify password and create session
// ---------------------------------------------------------------------------

// Simple in-memory rate limiter (resets on server restart)
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.until) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordAttempt(ip: string): void {
  const entry = attempts.get(ip);
  if (!entry || Date.now() > entry.until) {
    attempts.set(ip, { count: 1, until: Date.now() + WINDOW_MS });
  } else {
    entry.count++;
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait 1 minute and try again." },
        { status: 429 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const expected = process.env.ADMIN_PASSWORD;

    if (!expected) {
      await createSession();
      return NextResponse.json({ message: "Logged in (no password configured)" });
    }

    if (password !== expected) {
      recordAttempt(ip);
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    await createSession();
    return NextResponse.json({ message: "Logged in" });
  } catch (error) {
    logger.error("Login failed", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
