import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma, withRetry, reapStuckRuns } from "@nextflow/db";
import WorkflowEditor from "@/components/canvas/WorkflowEditor";
import { classifyDbError } from "@/lib/dbErrors";
import ServiceUnavailable from "@/components/ServiceUnavailable";

export const dynamic = "force-dynamic";

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[WorkflowPage] Clerk auth error:", error);
  }

  if (!userId) redirect("/sign-in");

  let result;
  try {
    // Lazily fail runs whose worker died (replaces the old 5-minute cron that kept the DB awake).
    await reapStuckRuns({ userId: userId as string, workflowId: id });
    result = await Promise.all([
      withRetry(() =>
        prisma.workflow.findFirst({
          where: { id, userId: userId as string },
          include: {
            workflowRuns: {
              orderBy: { createdAt: "desc" },
              take: 20,
              include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
            },
          },
        })
      ),
      withRetry(() =>
        prisma.workflow.findMany({
          where: { userId: userId as string },
          orderBy: { updatedAt: "desc" },
          select: { id: true, name: true, updatedAt: true },
        })
      ),
    ]);
  } catch (err) {
    const outage = classifyDbError(err);
    if (!outage) throw err;
    console.error(`[workflow] database outage (${outage}):`, err instanceof Error ? err.message : err);
    return <ServiceUnavailable kind={outage} retryHref={`/workflow/${id}`} />;
  }
  const [workflow, allWorkflows] = result;

  if (!workflow) notFound();

  // Serialize Prisma output to plain objects to prevent "An error occurred in the Server Components render"
  const safeWorkflow = JSON.parse(JSON.stringify({
    id: workflow.id,
    name: workflow.name,
    nodes: workflow.nodes || [],
    edges: workflow.edges || [],
    workflowRuns: workflow.workflowRuns || []
  }));

  const safeAllWorkflows = JSON.parse(JSON.stringify(allWorkflows));

  return (
    <WorkflowEditor
      workflow={safeWorkflow}
      allWorkflows={safeAllWorkflows}
    />
  );
}
