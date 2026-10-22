import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, withRetry } from "@nextflow/db";
import { z } from "zod";
import { withDbOutage } from "@/lib/dbErrors";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2_000_000; // 2MB — a workflow graph should never legitimately need more

const nodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.any()).optional(),
}).passthrough();

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
}).passthrough();

const patchWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  nodes: z.array(nodeSchema).max(500).optional(),
  edges: z.array(edgeSchema).max(1000).optional(),
});

async function handlePATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Workflow/ID PATCH] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawText = await req.text();
  if (rawText.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Workflow payload is too large" }, { status: 413 });
  }

  let rawBody: unknown;
  try {
    rawBody = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchWorkflowSchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: "Invalid workflow payload" }, { status: 400 });
  const body = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma's Json column type doesn't structurally match our node/edge shape
  const data = { ...(body.name && { name: body.name }), ...(body.nodes !== undefined && { nodes: body.nodes as any }), ...(body.edges !== undefined && { edges: body.edges as any }) };
  const { count } = await withRetry(() => prisma.workflow.updateMany({ where: { id, userId }, data }));
  if (count === 0) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

async function handleDELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Workflow/ID DELETE] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { count } = await withRetry(() => prisma.workflow.deleteMany({ where: { id, userId } }));
  if (count === 0) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

// Database outages (e.g. provider quota exceeded) answer 503 instead of crashing.
export const PATCH = withDbOutage(handlePATCH);
export const DELETE = withDbOutage(handleDELETE);
