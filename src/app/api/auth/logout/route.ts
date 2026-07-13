import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

// ---------------------------------------------------------------------------
// POST /api/auth/logout  → destroy session
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ message: "Logged out" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
