import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma, withRetry, reapStuckRuns } from "@nextflow/db";
import DashboardClient from "./DashboardClient";
import { TEMPLATES } from "@/lib/sampleWorkflow";
import { classifyDbError } from "@/lib/dbErrors";
import ServiceUnavailable from "@/components/ServiceUnavailable";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    return await renderDashboard();
  } catch (err) {
    const outage = classifyDbError(err);
    if (!outage) throw err;
    console.error(`[dashboard] database outage (${outage}):`, err instanceof Error ? err.message : err);
    return <ServiceUnavailable kind={outage} retryHref="/dashboard" />;
  }
}

async function renderDashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/dashboard");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress || `${userId}@example.com`;

  // A database outage here is caught by DashboardPage and shown as a "we'll be right back" screen.
  const [, workflowsRaw] = await Promise.all([
    withRetry(() => prisma.user.upsert({ where: { id: userId }, create: { id: userId, email }, update: {} })),
    withRetry(() => prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, updatedAt: true, nodes: true, edges: true, _count: { select: { workflowRuns: true } } },
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
      select: { id: true, name: true, updatedAt: true, nodes: true, edges: true, _count: { select: { workflowRuns: true } } },
    }));
    workflows = [created];
  }

  await reapStuckRuns({ userId });
  const recentRuns = await withRetry(() => prisma.workflowRun.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, status: true, createdAt: true, duration: true, runMode: true, workflowId: true, workflow: { select: { name: true } } },
  }));

  // Ship only what the card preview needs (type + position, and which nodes connect) —
  // never every node's prompt/output data.
  const safeWorkflows = workflows.map(w => {
    const nodes = (Array.isArray(w.nodes) ? w.nodes : []) as { id?: string; type?: string; position?: { x?: number; y?: number } }[];
    const index = new Map(nodes.map((n, i) => [n.id, i]));
    const edges = (Array.isArray(w.edges) ? w.edges : []) as { source?: string; target?: string }[];
    return {
      id: w.id,
      name: w.name,
      updatedAt: w.updatedAt.toISOString(),
      runCount: w._count.workflowRuns,
      nodeTypes: nodes.map(n => n?.type ?? "text"),
      preview: {
        nodes: nodes.map(n => ({ t: n?.type ?? "text", x: Number(n?.position?.x) || 0, y: Number(n?.position?.y) || 0 })),
        edges: edges.map(e => [index.get(e.source), index.get(e.target)]).filter((p): p is [number, number] => p[0] !== undefined && p[1] !== undefined),
      },
    };
  });
  const safeRuns = recentRuns.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }));

  return <DashboardClient workflows={safeWorkflows} recentRuns={safeRuns} userName={user?.firstName ?? null} />;
}
