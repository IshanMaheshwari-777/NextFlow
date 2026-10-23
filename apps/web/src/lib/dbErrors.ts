import { NextResponse } from "next/server";

export type DbOutage = "quota" | "unreachable" | "misconfigured" | "schema";

/**
 * Recognises "the database itself is unavailable" failures (as opposed to bugs), so pages
 * can show a calm outage screen and APIs can answer 503 instead of a generic 500. In
 * production Next.js strips error messages before they reach error.tsx, so this has to
 * happen on the server.
 */
export function classifyDbError(err: unknown): DbOutage | null {
  const e = err as { message?: string; code?: string; errorCode?: string; name?: string } | null;
  const msg = (e?.message ?? "").toLowerCase();
  const code = e?.code ?? e?.errorCode ?? "";
  if (msg.includes("exceeded the quota") || msg.includes("compute time quota") || msg.includes("data transfer quota")) return "quota";
  // Fresh/empty database: tables were never created (P2021 table missing, P2022 column missing).
  if (code === "P2021" || code === "P2022" || (msg.includes("does not exist") && msg.includes("table"))) return "schema";
  if (msg.includes("missing required environment variable: database_url") || code === "P1012" || code === "P1013") return "misconfigured";
  if (
    ["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code) ||
    e?.name === "PrismaClientInitializationError" ||
    msg.includes("can't reach database") || msg.includes("connection refused") || msg.includes("terminating connection")
  ) return "unreachable";
  return null;
}

/** For route handlers: turn a DB outage into a 503 the client can show; rethrow anything else. */
export function dbOutageResponse(err: unknown) {
  const kind = classifyDbError(err);
  if (!kind) throw err;
  console.error(`[db] outage (${kind}):`, err instanceof Error ? err.message : err);
  return NextResponse.json(
    { error: "NextFlow can't reach its database right now. Your work is safe — please try again in a few minutes.", outage: kind },
    { status: 503, headers: { "Retry-After": "60" } }
  );
}

/** Wraps a route handler so database outages become 503s instead of unhandled 500s. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic over Next's handler signatures
export function withDbOutage<H extends (...args: any[]) => Promise<Response>>(handler: H): H {
  return (async (...args: Parameters<H>) => {
    try { return await handler(...args); } catch (err) { return dbOutageResponse(err); }
  }) as H;
}
