import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks, runs } from "@trigger.dev/sdk/v3";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

    const systemPrompt = `You are a workflow automation expert. Generate a structured JSON workflow for a React Flow based application. 
The workflow consists of nodes and edges.
Available node types: 'text', 'upload-image', 'upload-video', 'llm', 'crop-image', 'extract-frame', 'generate-image', 'prompt-enhancer', 'video-enhance'.
Each node has: id, type, position {x, y}, data {label}.
Edges connect nodes: id, source, sourceHandle, target, targetHandle.
Handles: 
- 'text': inputs [], outputs [output (text)]
- 'upload-image': inputs [], outputs [output (image)]
- 'upload-video': inputs [], outputs [output (video)]
- 'llm': inputs [system_prompt (text), user_message (text), images (image)], outputs [output (text)]
- 'crop-image': inputs [imageUrl (image)], outputs [output (image)]
- 'extract-frame': inputs [video_url (video)], outputs [output (image)]
- 'generate-image': inputs [prompt (text)], outputs [output (image)]
- 'prompt-enhancer': inputs [prompt (text)], outputs [output (text)]
- 'video-enhance': inputs [video_url (video)], outputs [output (video)] — upscales resolution (720p/1080p/4K), denoises, sharpens, and enhances color using FFmpeg via Transloadit; connects to extract-frame or other video consumers

Return ONLY a JSON object with 'nodes' and 'edges' arrays. 
Layout nodes logically (e.g., 300px apart horizontally). 
Ensure handles match correctly according to the definitions above.
Do not include any markdown formatting, just the raw JSON object.`;

    // @ts-ignore
    const handle = await tasks.trigger("llm-node", {
      model: "llama-3.1-8b-instant",
      system_prompt: systemPrompt,
      user_message: `Generate a workflow for: ${prompt}`,
    });

    const maxWait = 30000;
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const r = await runs.retrieve(handle.id);
      if (r.status === "COMPLETED") {
        let text = (r.output as any).text || "";
        // Clean markdown if present
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        try {
          const workflow = JSON.parse(text);
          return NextResponse.json(workflow);
        } catch (e) {
          console.error("Failed to parse AI workflow output:", text);
          return NextResponse.json({ error: "AI generated invalid workflow format" }, { status: 500 });
        }
      }
      if (["FAILED", "CANCELED", "CRASHED"].includes(r.status)) {
        return NextResponse.json({ error: "Workflow generation failed" }, { status: 500 });
      }
      await new Promise(res => setTimeout(res, 1000));
    }

    return NextResponse.json({ error: "Generation timed out" }, { status: 504 });
  } catch (error: any) {
    console.error("[API/Workflow/Generate] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
