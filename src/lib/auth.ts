// ---------------------------------------------------------------------------
// Auth Helpers
// ---------------------------------------------------------------------------
// Simple cookie-based auth for the admin UI.
// Uses ADMIN_PASSWORD env var and HMAC-signed tokens.
// No database needed — session is self-contained in the cookie.
//
// Two tiers:
//   - Edge-safe: verifyToken(tokenString) — pure function, no next/headers
//   - Server-only: createSession(), destroySession() — use next/headers

import { cookies } from "next/headers";

const SESSION_COOKIE = "rea3_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

/**
 * Derive a secret key for HMAC from the admin password.
 * If no password is configured, returns null (auth is disabled).
 */
function getSecret(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 4) return null;
  return pw;
}

/**
 * Edge-safe: sign a payload with HMAC-SHA256.
 * Pure function — no next/headers dependency. Works in Edge Runtime.
 */
export async function signToken(payload: string): Promise<string> {
  const secret = getSecret();
  if (!secret) return payload;
  return hmacSign(secret, payload);
}

/**
 * Edge-safe: verify an HMAC-signed token and return the original payload,
 * or null if invalid.
 * Pure function — no next/headers dependency. Works in Edge Runtime.
 */
export async function verifyToken(signed: string): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return signed;
  return hmacVerify(secret, signed);
}

// ---------------------------------------------------------------------------
// HMAC primitives (pure, no next/headers)
// ---------------------------------------------------------------------------

async function hmacSign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${payload}.${hex}`;
}

async function hmacVerify(secret: string, signed: string): Promise<string | null> {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = signed.slice(0, lastDot);
  const sig = signed.slice(lastDot + 1);
  const expected = await hmacSign(secret, payload);
  const expectedSig = expected.slice(lastDot + 1);
  if (sig.length !== expectedSig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  return diff === 0 ? payload : null;
}

/** Sign a payload with HMAC-SHA256 using the admin password as key. (legacy — prefer signToken) */
async function sign(payload: string): Promise<string> {
  return signToken(payload);
}

/**
 * Verify an HMAC-signed payload. Returns the original payload if valid, null otherwise. (legacy — prefer verifyToken)
 */
async function verify(signed: string): Promise<string | null> {
  return verifyToken(signed);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if a session cookie is valid.
 * Returns true if the user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const result = await verify(token);
  return result !== null;
}

/**
 * Create a session cookie and set it on the response.
 * Calls `set` on the cookie store (must be called from a Server Action or Route Handler).
 */
export async function createSession(): Promise<void> {
  const store = await cookies();
  const token = await sign(`rea3_session_${Date.now()}`);
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

/**
 * Destroy the session cookie.
 */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Verify a bearer token for API-to-API calls.
 * Checks against ERP_INTERNAL_API_KEY.
 */
export function isValidApiKey(token: string | null): boolean {
  if (!token) return false;
  const expected = process.env.ERP_INTERNAL_API_KEY;
  if (!expected) return false; // no key configured = no API auth
  // Constant-time compare
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
