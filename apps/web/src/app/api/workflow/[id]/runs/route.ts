import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, withRetry } from "@nextflow/db";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Workflow/Runs] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const runs = await withRetry(() => prisma.workflowRun.findMany({
    where: { workflowId: id, userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
  }));
  return NextResponse.json({ runs });
}
