import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma, withRetry } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

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

  // Upsert user to ensure they exist in DB
  await withRetry(() =>
    prisma.user.upsert({
      where: { id: userId as string },
      create: { id: userId as string, email: `${userId}@example.com` },
      update: {},
    })
  );

  const allWorkflows = await withRetry(() =>
    prisma.workflow.findMany({
      where: { userId: userId as string },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, updatedAt: true, nodes: true },
    })
  );

  const recentRuns = await withRetry(() =>
    prisma.workflowRun.findMany({
      where: { userId: userId as string },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { workflow: { select: { name: true } } }
    })
  );

  const safeWorkflows = JSON.parse(JSON.stringify(allWorkflows));
  const safeRuns = JSON.parse(JSON.stringify(recentRuns));

  return <DashboardClient workflows={safeWorkflows} recentRuns={safeRuns} />;
}
