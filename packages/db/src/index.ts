import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing required environment variable: DATABASE_URL");
  // Neon suspends idle computes and can take >5s (Prisma's default) to wake one up,
  // which surfaces as a misleading P1001 "can't reach database". Give it room.
  if (url.includes("connect_timeout=")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connect_timeout=20`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Neon serverless: handle disconnections gracefully
    datasourceUrl: getDatabaseUrl(),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// No eager $connect(): Prisma connects lazily on the first query. Pre-warming opened a
// database connection on every serverless cold start — even for requests that never
// touch the DB — which needlessly wakes a scale-to-zero database like Neon.

/**
 * Retry wrapper for Prisma operations that may fail due to
 * Neon's aggressive idle connection termination.
 * Error: FATAL: terminating connection due to administrator command
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const err = error as { message?: string; code?: string };
      const isConnectionError =
        err?.message?.includes("terminating connection") ||
        err?.message?.includes("Connection refused") ||
        err?.message?.includes("connection is not open") ||
        err?.code === "P1017" || // Prisma: server has closed the connection
        err?.code === "P1001" || // Prisma: can't reach database
        err?.code === "P2024";   // Prisma: timed out fetching a connection
      if (isConnectionError && attempt < retries) {
        console.warn(`[prisma] Connection error (attempt ${attempt + 1}/${retries + 1}), retrying...`, err.message);
        // Disconnect to force a fresh connection on retry
        try { await prisma.$disconnect(); } catch {}
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error("withRetry: unreachable");
}

/** run-workflow's own maxDuration is 300s; 10 minutes leaves headroom for retries. */
export const STUCK_RUN_THRESHOLD_MS = 10 * 60 * 1000;
const TIMEOUT_ERROR = "Timed out — this run took too long and was stopped automatically.";

/**
 * Marks runs that have been "running" for too long (worker crashed, deploy evicted it, …)
 * as failed. This used to be a 5-minute cron, but a schedule that touches Postgres every
 * 5 minutes keeps a serverless database (Neon) awake 24/7 and burns its whole monthly
 * compute quota with zero users. Instead it runs lazily, only when someone actually looks
 * at runs — so an idle app makes zero database calls.
 */
export async function reapStuckRuns(scope: { userId: string; workflowId?: string; runId?: string }): Promise<number> {
  const cutoff = new Date(Date.now() - STUCK_RUN_THRESHOLD_MS);
  const stuck = await withRetry(() => prisma.workflowRun.findMany({
    where: {
      userId: scope.userId,
      ...(scope.workflowId ? { workflowId: scope.workflowId } : {}),
      ...(scope.runId ? { id: scope.runId } : {}),
      status: "running",
      startedAt: { lt: cutoff },
    },
    select: { id: true },
  }));
  if (stuck.length === 0) return 0;
  const ids = stuck.map(r => r.id);
  const now = new Date();
  await withRetry(() => prisma.$transaction([
    prisma.nodeRun.updateMany({ where: { workflowRunId: { in: ids }, status: "running" }, data: { status: "failed", error: TIMEOUT_ERROR, completedAt: now } }),
    prisma.workflowRun.updateMany({ where: { id: { in: ids }, status: "running" }, data: { status: "failed", error: TIMEOUT_ERROR, completedAt: now } }),
  ]));
  return ids.length;
}

export type { PrismaClient } from "@prisma/client";
export * from "@prisma/client";
