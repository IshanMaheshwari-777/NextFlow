import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, withRetry } from "@/lib/prisma";

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
  
  await withRetry(() => prisma.user.upsert({ where: { id: userId as string }, create: { id: userId as string, email: "user@example.com" }, update: {} }));
  const body = await req.json();
  const workflow = await withRetry(() => prisma.workflow.create({ data: { userId: userId as string, name: body.name || "New Workflow", nodes: [], edges: [] } }));
  return NextResponse.json(workflow, { status: 201 });
}
