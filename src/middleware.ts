// ---------------------------------------------------------------------------
// Next.js Middleware — re-exports the auth proxy as `middleware`
// ---------------------------------------------------------------------------
// The actual logic lives in proxy.ts so auth-edge imports stay pure.
// Next.js App Router looks for a `middleware` named export.
// ---------------------------------------------------------------------------

export { proxy as middleware, config } from "./proxy";
