import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma, withRetry } from "@/lib/prisma";
import WorkflowEditor from "@/components/canvas/WorkflowEditor"

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

  // A DB fetch failure here throws and is caught by the nearest error.tsx boundary
  // (src/app/error.tsx), which has its own retry action — no need to duplicate that
  // fallback UI here.
  const [workflow, allWorkflows] = await Promise.all([
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
