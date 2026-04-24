import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const { videoUrl, timestamp } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
    }

    // @ts-ignore
    const result = await tasks.triggerAndWait("extract-frame-node", {
      payload: {
        nodeId: "test-video",
        workflowRunId: "test",
        video_url: videoUrl,
        timestamp: timestamp ?? 0,
      },
      timeout: { durationInMs: 120_000 },
    });

    const elapsed = Date.now() - start;
    return NextResponse.json({
      success: result.ok,
      output: result.ok ? result.output : null,
      error: result.ok ? null : result.error,
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
