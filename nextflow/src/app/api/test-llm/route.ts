import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const { model, system_prompt, user_message } = await req.json();

    // @ts-ignore
    const result = await tasks.triggerAndWait("llm-node", {
      payload: {
        nodeId: "test-llm",
        workflowRunId: "test",
        model: model || "llama-3.1-8b-instant",
        system_prompt: system_prompt || "You are a helpful assistant.",
        user_message: user_message || "Say hello in one sentence.",
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
