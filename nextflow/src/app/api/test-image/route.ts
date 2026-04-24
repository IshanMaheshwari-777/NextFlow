import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    // @ts-ignore — tasks.triggerAndPoll is the correct method for API routes
    const run = await tasks.triggerAndPoll("crop-image-node", {
      nodeId: "test-image",
      workflowRunId: "test",
      imageUrl,
      x_percent: 10,
      y_percent: 10,
      width_percent: 80,
      height_percent: 80,
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
