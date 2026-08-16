import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma, withRetry } from "@nextflow/db";
import { z } from "zod";

const createWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  sample: z.boolean().optional(),
});

export const dynamic = "force-dynamic";

export async function GET() {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Workflow GET] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workflows = await withRetry(() => prisma.workflow.findMany({ where: { userId: userId as string }, orderBy: { updatedAt: "desc" } }));
  return NextResponse.json({ workflows });
}

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Workflow POST] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress || `${userId}@example.com`;
  await withRetry(() => prisma.user.upsert({ where: { id: userId as string }, create: { id: userId as string, email }, update: {} }));

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }
  const parsed = createWorkflowSchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const body = parsed.data;

  if (body.sample) {
    const { SAMPLE_NODES, SAMPLE_EDGES } = await import("@/lib/sampleWorkflow");
    const workflow = await withRetry(() => prisma.workflow.create({
      data: {
        userId: userId as string,
        name: "Product Marketing Kit Generator",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma's Json column type doesn't structurally match our node/edge shape
        nodes: SAMPLE_NODES as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        edges: SAMPLE_EDGES as any,
      }
    }));
    return NextResponse.json(workflow, { status: 201 });
  }

  const workflow = await withRetry(() => prisma.workflow.create({ data: { userId: userId as string, name: body.name || "New Workflow", nodes: [], edges: [] } }));
  return NextResponse.json(workflow, { status: 201 });
}
