import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { prisma, withRetry } from "@nextflow/db";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
type AppNode = { id: string; type: string; position: { x: number; y: number }; data: Record<string, any> };

/**
 * Kicks off a run and returns immediately with the run ID — the actual node-by-node
 * execution happens in the "run-workflow" Trigger.dev task (src/trigger/runWorkflowTask.ts),
 * which isn't bound by this route's serverless request lifetime. The client polls
 * GET /api/workflow/[id]/run/[runId] for live progress instead of holding a stream open.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Workflow/Run] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = await checkRateLimit("run", userId);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "You're running workflows too quickly. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const workflow = await withRetry(() => prisma.workflow.findFirst({ where: { id, userId } }));
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { nodes?: AppNode[]; edges?: unknown[]; runMode?: string; selectedNodeIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const { nodes, edges, runMode = "full", selectedNodeIds = [] } = body;
  if (!nodes || !Array.isArray(nodes)) {
    return NextResponse.json({ error: "Missing or invalid nodes array" }, { status: 400 });
  }

  let activeNodes: AppNode[] = nodes;
  if ((runMode === "selected" || runMode === "single") && selectedNodeIds.length > 0) {
    activeNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
  }

  const run = await withRetry(() => prisma.workflowRun.create({
    data: { workflowId: id, userId, status: "running", runMode, selectedNodeIds, startedAt: new Date() },
  }));

  try {
    await tasks.trigger("run-workflow", { workflowRunId: run.id, activeNodes, allNodes: nodes, edges: edges || [] });
  } catch (err) {
    console.error("[API/Workflow/Run] Failed to enqueue run-workflow task:", err instanceof Error ? err.message : err);
    await withRetry(() => prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: "failed", error: "Failed to start the run. Please try again.", completedAt: new Date() },
    }));
    return NextResponse.json({ error: "Failed to start the run" }, { status: 502 });
  }

  return NextResponse.json({ runId: run.id, status: "running" }, { status: 202 });
}
