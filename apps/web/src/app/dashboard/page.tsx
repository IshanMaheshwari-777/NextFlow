import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma, withRetry } from "@nextflow/db";
import DashboardClient from "./DashboardClient";
import { TEMPLATES } from "@/lib/sampleWorkflow";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/dashboard");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress || `${userId}@example.com`;

  // A DB failure here throws into src/app/error.tsx, which explains it and offers a retry.
  const [, workflowsRaw] = await Promise.all([
    withRetry(() => prisma.user.upsert({ where: { id: userId }, create: { id: userId, email }, update: {} })),
    withRetry(() => prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, updatedAt: true, nodes: true, _count: { select: { workflowRuns: true } } },
    })),
  ]);

  let workflows = workflowsRaw;
  // First visit: seed a template that runs end-to-end with zero setup, so the very first
  // "Run" click succeeds instead of failing on a missing upload.
  if (workflows.length === 0) {
    const t = TEMPLATES["prompt-to-image"];
    const created = await withRetry(() => prisma.workflow.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma's Json column type doesn't structurally match our node/edge shape
      data: { userId, name: t.name, nodes: t.nodes as any, edges: t.edges as any },
      select: { id: true, name: true, updatedAt: true, nodes: true, _count: { select: { workflowRuns: true } } },
    }));
    workflows = [created];
  }

  const recentRuns = await withRetry(() => prisma.workflowRun.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, status: true, createdAt: true, duration: true, runMode: true, workflowId: true, workflow: { select: { name: true } } },
  }));

  // Only node *types* are needed for card previews — don't ship every node's data to the client.
  const safeWorkflows = workflows.map(w => ({
    id: w.id,
    name: w.name,
    updatedAt: w.updatedAt.toISOString(),
    runCount: w._count.workflowRuns,
    nodeTypes: (Array.isArray(w.nodes) ? w.nodes : []).map(n => (n as { type?: string })?.type ?? "text"),
  }));
  const safeRuns = recentRuns.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }));

  return <DashboardClient workflows={safeWorkflows} recentRuns={safeRuns} userName={user?.firstName ?? null} />;
}
