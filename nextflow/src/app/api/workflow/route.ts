import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, withRetry } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workflows = await withRetry(() => prisma.workflow.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }));
  return NextResponse.json({ workflows });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await withRetry(() => prisma.user.upsert({ where: { id: userId }, create: { id: userId, email: "user@example.com" }, update: {} }));
  const body = await req.json();
  const workflow = await withRetry(() => prisma.workflow.create({ data: { userId, name: body.name || "New Workflow", nodes: [], edges: [] } }));
  return NextResponse.json(workflow, { status: 201 });
}
