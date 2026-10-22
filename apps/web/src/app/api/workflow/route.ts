import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma, withRetry } from "@nextflow/db";
import { z } from "zod";

const createWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  /** Legacy flag — same as template: "marketing-kit". */
  sample: z.boolean().optional(),
  template: z.enum(["prompt-to-image", "marketing-kit"]).optional(),
  duplicateOf: z.string().min(1).max(64).optional(),
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

  const templateId = body.template ?? (body.sample ? "marketing-kit" : undefined);
  if (templateId) {
    const { TEMPLATES } = await import("@/lib/sampleWorkflow");
    const t = TEMPLATES[templateId];
    const workflow = await withRetry(() => prisma.workflow.create({
      data: {
        userId: userId as string,
        name: body.name || t.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma's Json column type doesn't structurally match our node/edge shape
        nodes: t.nodes as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        edges: t.edges as any,
      }
    }));
    return NextResponse.json(workflow, { status: 201 });
  }

  if (body.duplicateOf) {
    const src = await withRetry(() => prisma.workflow.findFirst({ where: { id: body.duplicateOf, userId: userId as string } }));
    if (!src) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    const workflow = await withRetry(() => prisma.workflow.create({
      data: { userId: userId as string, name: body.name || `${src.name} (copy)`.slice(0, 200), nodes: src.nodes ?? [], edges: src.edges ?? [] },
    }));
    return NextResponse.json(workflow, { status: 201 });
  }

  const workflow = await withRetry(() => prisma.workflow.create({ data: { userId: userId as string, name: body.name || "New Workflow", nodes: [], edges: [] } }));
  return NextResponse.json(workflow, { status: 201 });
}
