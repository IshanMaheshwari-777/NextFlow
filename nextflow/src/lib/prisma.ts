import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Neon serverless: handle disconnections gracefully
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Pre-warm the connection pool on cold start
prisma.$connect().catch(() => {});

/**
 * Retry wrapper for Prisma operations that may fail due to
 * Neon's aggressive idle connection termination.
 * Error: FATAL: terminating connection due to administrator command
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isConnectionError =
        error?.message?.includes("terminating connection") ||
        error?.message?.includes("Connection refused") ||
        error?.message?.includes("connection is not open") ||
        error?.code === "P1017" || // Prisma: server has closed the connection
        error?.code === "P1001" || // Prisma: can't reach database
        error?.code === "P2024";   // Prisma: timed out fetching a connection
      if (isConnectionError && attempt < retries) {
        console.warn(`[prisma] Connection error (attempt ${attempt + 1}/${retries + 1}), retrying...`, error.message);
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
