import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const { videoUrl, timestamp } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
    }

    // @ts-ignore — tasks.triggerAndPoll is the correct method for API routes
    const run = await tasks.triggerAndPoll("extract-frame-node", {
      nodeId: "test-video",
      workflowRunId: "test",
      video_url: videoUrl,
      timestamp: timestamp ?? 0,
    }, { pollIntervalMs: 500 });

    const elapsed = Date.now() - start;
    return NextResponse.json({
      success: run.status === "COMPLETED",
      output: run.output || null,
      status: run.status,
      durationMs: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || "Unknown error",
      durationMs: Date.now() - start,
    }, { status: 500 });
  }
}
