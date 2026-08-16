import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma, withRetry } from "@nextflow/db";
import DashboardClient from "./DashboardClient";
import { SAMPLE_NODES, SAMPLE_EDGES } from "@/lib/sampleWorkflow";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[Dashboard] Clerk auth error:", error);
  }

  if (!userId) redirect("/sign-in");

  // Run user upsert and workflow fetch in parallel
  const [, allWorkflowsRaw] = await Promise.all([
    withRetry(() =>
      prisma.user.upsert({
        where: { id: userId as string },
        create: { id: userId as string, email: `${userId}@example.com` },
        update: {},
      })
    ),
    withRetry(() =>
      prisma.workflow.findMany({
        where: { userId: userId as string },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, updatedAt: true, nodes: true },
      })
    ),
  ]);

  let allWorkflows = allWorkflowsRaw;

  if (allWorkflows.length === 0) {
    const sampleWorkflow = await withRetry(() =>
      prisma.workflow.create({
        data: {
          userId: userId as string,
          name: "Product Marketing Kit Generator",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma's Json column type doesn't structurally match our node/edge shape
          nodes: SAMPLE_NODES as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          edges: SAMPLE_EDGES as any,
        },
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allWorkflows = [{ id: sampleWorkflow.id, name: sampleWorkflow.name, updatedAt: sampleWorkflow.updatedAt, nodes: sampleWorkflow.nodes as any }];
  }

  // Fetch recent runs in parallel (don't block on it)
  const recentRuns = await withRetry(() =>
    prisma.workflowRun.findMany({
      where: { userId: userId as string },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, status: true, createdAt: true, duration: true, runMode: true,
        workflow: { select: { name: true } }
      }
    })
  );

  const safeWorkflows = JSON.parse(JSON.stringify(allWorkflows));
  const safeRuns = JSON.parse(JSON.stringify(recentRuns));

  return <DashboardClient workflows={safeWorkflows} recentRuns={safeRuns} />;
}
