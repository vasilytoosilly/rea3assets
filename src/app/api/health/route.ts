import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// GET /health  → lightweight health check endpoint
// ---------------------------------------------------------------------------
// Returns 200 when the service is alive. Used by:
//   - the ERP connection test (src/app/api/settings/erp-test)
//   - the ERP status probe (src/app/api/settings/status)
//   - external monitoring / load balancers
//
// This endpoint is listed as PUBLIC in proxy.ts so it requires no auth.

export async function GET() {
  try {
    return NextResponse.json({
      status: "ok",
      service: "rea3-assets",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Health check failed", { error: String(error) });
    return NextResponse.json(
      { status: "error", error: "Internal server error" },
      { status: 500 },
    );
  }
}
