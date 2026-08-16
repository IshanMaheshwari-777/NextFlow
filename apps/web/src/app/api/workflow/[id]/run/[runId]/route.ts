import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, withRetry } from "@nextflow/db";

export const dynamic = "force-dynamic";

/** Lightweight single-run poll target — used by the client while a run is in flight. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;

  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Workflow/Run/Status] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const run = await withRetry(() => prisma.workflowRun.findFirst({
    where: { id: runId, workflowId: id, userId },
    include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
  }));
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ run });
}
