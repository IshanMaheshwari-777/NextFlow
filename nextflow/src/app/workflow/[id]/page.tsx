import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma, withRetry } from "@/lib/prisma";
import WorkflowEditor from "@/components/canvas/WorkflowEditor"

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

  const workflow = await withRetry(() =>
    prisma.workflow.findFirst({
      where: { id, userId },
      include: {
        workflowRuns: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
        },
      },
    })
  );

  if (!workflow) notFound();

  const allWorkflows = await withRetry(() =>
    prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, updatedAt: true },
    })
  );

  return (
    <WorkflowEditor
      workflow={{ id: workflow.id, name: workflow.name, nodes: (workflow.nodes as any) || [], edges: (workflow.edges as any) || [], workflowRuns: (workflow.workflowRuns as any) || [] }}
      allWorkflows={allWorkflows}
    />
  );
}
