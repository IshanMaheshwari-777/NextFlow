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
    // Only the user who started an upload may read its result.
    if (!r.tags?.includes(`owner_${userId}`.slice(0, 128))) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const error = (r as { error?: { message?: string } }).error?.message;
    return NextResponse.json({ status: r.status, output: r.output, error });
  } catch (err) {
    if ((err as { status?: number })?.status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error("[API/Upload/Status]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't check the upload status." }, { status: 500 });
  }
}
