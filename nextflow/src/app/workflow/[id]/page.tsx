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

  try {
    const workflow = await withRetry(() =>
      prisma.workflow.findFirst({
        where: { id, userId: userId as string },
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
        where: { userId: userId as string },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, updatedAt: true },
      })
    );

    // CRITICAL FIX: Serialize Prisma output to plain objects to prevent "An error occurred in the Server Components render"
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
  } catch (error: any) {
    if (error?.message === "NEXT_NOT_FOUND" || error?.digest?.startsWith("NEXT_NOT_FOUND")) throw error;
    console.error("[WorkflowPage] Database error:", error);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0f", color: "#e4e4ed", padding: "2rem" }}>
        <h2>Unable to load workflow</h2>
        <p style={{ color: "#8b8b9e", marginBottom: "20px" }}>We encountered an error connecting to the database.</p>
        <div style={{ background: "#1c1c28", padding: "1rem", borderRadius: "8px", textAlign: "left", fontFamily: "monospace", fontSize: "0.85rem", overflowX: "auto", maxWidth: "800px", width: "100%", marginBottom: "20px" }}>
          <strong style={{ color: "#f87171" }}>Error Details:</strong>
          <pre style={{ margin: "0.5rem 0 0 0", whiteSpace: "pre-wrap", color: "#fca5a5" }}>
            {error?.message || error?.toString() || "Unknown error"}
          </pre>
        </div>
        <button onClick={() => { }} style={{ padding: "8px 16px", background: "#8b5cf6", color: "white", borderRadius: "8px", border: "none" }}>Try Again</button>
      </div>
    );
  }
}
