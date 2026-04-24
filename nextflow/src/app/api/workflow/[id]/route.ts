import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, withRetry } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Workflow/ID PATCH] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await withRetry(() => prisma.workflow.updateMany({
    where: { id, userId },
    data: { ...(body.name && { name: body.name }), ...(body.nodes !== undefined && { nodes: body.nodes }), ...(body.edges !== undefined && { edges: body.edges }) },
  }));
  return NextResponse.json({ success: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Workflow/ID DELETE] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await withRetry(() => prisma.workflow.deleteMany({ where: { id, userId } }));
  return NextResponse.json({ success: true });
}
