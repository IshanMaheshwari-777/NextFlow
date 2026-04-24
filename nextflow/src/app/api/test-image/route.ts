import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    // Test crop with center 50% crop
    // @ts-ignore
    const result = await tasks.triggerAndWait("crop-image-node", {
      payload: {
        nodeId: "test-image",
        workflowRunId: "test",
        imageUrl,
        x_percent: 10,
        y_percent: 10,
        width_percent: 80,
        height_percent: 80,
      },
      timeout: { durationInMs: 60_000 },
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
