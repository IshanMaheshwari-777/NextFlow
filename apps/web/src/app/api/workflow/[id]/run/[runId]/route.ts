import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, withRetry, reapStuckRuns, STUCK_RUN_THRESHOLD_MS } from "@nextflow/db";
import { withDbOutage } from "@/lib/dbErrors";

export const dynamic = "force-dynamic";

/** Lightweight single-run poll target — used by the client while a run is in flight. */
async function handleGET(_: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;

  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Workflow/Run/Status] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const load = () => withRetry(() => prisma.workflowRun.findFirst({
    where: { id: runId, workflowId: id, userId },
    include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
  }));
  let run = await load();
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // A run whose worker died would otherwise poll as "running" forever.
  if (run.status === "running" && Date.now() - run.startedAt.getTime() > STUCK_RUN_THRESHOLD_MS) {
    await reapStuckRuns({ userId, runId });
    run = (await load()) ?? run;
  }

  return NextResponse.json({ run });
}

// Database outages (e.g. provider quota exceeded) answer 503 instead of crashing.
export const GET = withDbOutage(handleGET);
