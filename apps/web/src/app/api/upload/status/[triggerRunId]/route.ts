import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runs } from "@trigger.dev/sdk/v3";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ triggerRunId: string }> }) {
  const { triggerRunId } = await params;

  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Upload/Status] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const r = await runs.retrieve(triggerRunId);
    const error = (r as { error?: { message?: string } }).error?.message;
    return NextResponse.json({ status: r.status, output: r.output, error });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check upload status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
