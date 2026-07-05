import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/settings/erp-config  → expose ERP connection info (server-side only)
// ---------------------------------------------------------------------------
// Reads env vars on the server and returns sanitised config.
// No sensitive values are exposed — API key is shown as present/absent flag.
// The "erp-test" endpoint already handles connectivity testing.

export async function GET() {
  const erpUrl = process.env.ERP_INTERNAL_URL ?? "http://localhost:3000";
  const hasApiKey = !!process.env.ERP_INTERNAL_API_KEY;

  return NextResponse.json({
    erp_url: erpUrl,
    has_api_key: hasApiKey,
    configured: hasApiKey,
  });
}
