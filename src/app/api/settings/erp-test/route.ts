import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// POST /api/settings/erp-test  → test connection to the core rea3erp
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    const erpUrl = process.env.ERP_INTERNAL_URL ?? "http://localhost:3000";
    const apiKey = process.env.ERP_INTERNAL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ERP_INTERNAL_API_KEY is not configured. Set it in your .env file." },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${erpUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      logger.info("ERP connection test succeeded", { erpUrl });
      return NextResponse.json({ message: `Connected to ERP at ${erpUrl}` });
    }

    logger.warn("ERP connection test returned non-OK", { erpUrl, status: res.status });
    return NextResponse.json(
      { error: `ERP returned status ${res.status}` },
      { status: 502 },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Connection timed out after 5s" },
        { status: 504 },
      );
    }
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("ERP connection test failed", { error: msg });
    return NextResponse.json(
      { error: `Connection failed: ${msg}` },
      { status: 502 },
    );
  }
}
