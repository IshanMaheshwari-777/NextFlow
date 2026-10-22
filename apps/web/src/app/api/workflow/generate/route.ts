import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks, runs } from "@trigger.dev/sdk/v3";
import { checkRateLimit } from "@/lib/rateLimit";
import { GROQ_DEFAULT_TEXT_MODEL } from "@nextflow/shared/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Valid handle definitions for validation
const VALID_HANDLES: Record<string, { inputs: string[]; outputs: string[] }> = {
  "text": { inputs: [], outputs: ["output"] },
  "upload-image": { inputs: [], outputs: ["output"] },
  "upload-video": { inputs: [], outputs: ["output"] },
  "llm": { inputs: ["system_prompt", "user_message", "images"], outputs: ["output"] },
  "crop-image": { inputs: ["imageUrl"], outputs: ["output"] },
  "extract-frame": { inputs: ["video_url"], outputs: ["output"] },
  "generate-image": { inputs: ["prompt"], outputs: ["output"] },
  "prompt-enhancer": { inputs: ["prompt"], outputs: ["output"] },
  "video-enhance": { inputs: ["video_url"], outputs: ["output"] },
};

const HANDLE_ALIASES: Record<string, string> = {
  "image_url": "imageUrl", "image": "imageUrl", "input_image": "imageUrl",
  "video": "video_url", "input_video": "video_url",
  "input": "prompt", "input_text": "user_message",
  "message": "user_message", "system": "system_prompt",
  "out": "output", "result": "output", "text": "output",
};

// Shape of a node/edge as the LLM returns it in its raw JSON, before validation/correction below.
type RawNode = { id: string; type: string; data?: { label?: string; connectedInputs?: string[]; [key: string]: unknown } };
type RawEdge = { id?: string; source: string; target: string; sourceHandle?: string; targetHandle?: string } | null;
type RawWorkflow = { nodes?: RawNode[]; edges?: RawEdge[] };

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rateLimit = await checkRateLimit("generate", userId);
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "You're generating workflows too quickly. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return NextResponse.json({ error: "Describe the workflow you want first." }, { status: 400 });
    if (prompt.length > 1500) return NextResponse.json({ error: "Please keep the description under 1,500 characters." }, { status: 400 });

    const systemPrompt = `You are a workflow automation expert. Generate a JSON workflow for a React Flow application.

AVAILABLE NODE TYPES AND THEIR EXACT HANDLE IDS:
- "text": outputs=["output" (text)]. A simple text input node.
- "upload-image": outputs=["output" (image)]. Uploads an image file.
- "upload-video": outputs=["output" (video)]. Uploads a video file.
- "llm": inputs=["system_prompt" (text), "user_message" (text), "images" (image)], outputs=["output" (text)]. Runs a large language model.
- "crop-image": inputs=["imageUrl" (image)], outputs=["output" (image)]. Crops an image.
- "extract-frame": inputs=["video_url" (video)], outputs=["output" (image)]. Extracts a frame from video.
- "generate-image": inputs=["prompt" (text)], outputs=["output" (image)]. Generates an image from text.
- "prompt-enhancer": inputs=["prompt" (text)], outputs=["output" (text)]. Enhances a prompt with AI.
- "video-enhance": inputs=["video_url" (video)], outputs=["output" (video)]. Upscales/enhances video quality.

RULES:
1. Each node must have: id (string), type (from list above), position ({x, y}), data ({label: string}).
2. Each edge must have: id (string), source (node id), sourceHandle (ALWAYS "output"), target (node id), targetHandle (EXACT input handle id from above).
3. sourceHandle is ALWAYS "output" for every edge.
4. targetHandle must be one of the EXACT input handle IDs listed above for that node type.
5. Layout nodes 300px apart horizontally, stagger vertically for readability.
6. Connect nodes logically — output types must match input types (text→text, image→image, video→video).
7. Make the workflow runnable: give every "text" node a useful starting value in data.text (e.g. a real system prompt or an example input), and set data.user_message / data.system_prompt on "llm" nodes when nothing is connected to them. Give nodes short, descriptive labels.

EXAMPLE: A workflow that enhances a prompt and generates an image:
{
  "nodes": [
    {"id": "text-1", "type": "text", "position": {"x": 100, "y": 200}, "data": {"label": "Your idea", "text": "a lighthouse on a cliff during a storm"}},
    {"id": "pe-1", "type": "prompt-enhancer", "position": {"x": 400, "y": 200}, "data": {"label": "Enhance Prompt"}},
    {"id": "gi-1", "type": "generate-image", "position": {"x": 700, "y": 200}, "data": {"label": "Generate Image"}}
  ],
  "edges": [
    {"id": "e1", "source": "text-1", "sourceHandle": "output", "target": "pe-1", "targetHandle": "prompt"},
    {"id": "e2", "source": "pe-1", "sourceHandle": "output", "target": "gi-1", "targetHandle": "prompt"}
  ]
}

Return ONLY a JSON object with "nodes" and "edges" arrays. No markdown, no explanation.`;

    const handle = await tasks.trigger("llm-node", {
      nodeId: "workflow-generator",
      model: GROQ_DEFAULT_TEXT_MODEL,
      system_prompt: systemPrompt,
      user_message: `Generate a workflow for: ${prompt}`,
    });

    // Leave headroom under maxDuration (60s) — a cold Trigger.dev worker can take 10s+ to pick up.
    const maxWait = 50000;
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const r = await runs.retrieve(handle.id);
      if (r.status === "COMPLETED") {
        let text = (r.output as { text?: string })?.text || "";
        // Clean markdown if present
        text = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```json/g, "").replace(/```/g, "").trim();
        // Models sometimes wrap the JSON in a sentence — keep only the outermost object.
        const first = text.indexOf("{"), last = text.lastIndexOf("}");
        if (first >= 0 && last > first) text = text.slice(first, last + 1);
        try {
          const workflow: RawWorkflow = JSON.parse(text);

          // Server-side validation and correction
          if (workflow.nodes && Array.isArray(workflow.nodes)) {
            // Validate node types
            const validTypes = new Set(Object.keys(VALID_HANDLES));
            workflow.nodes = workflow.nodes.filter(n => n.type && validTypes.has(n.type));

            // Ensure each node has proper data
            for (const node of workflow.nodes) {
              if (!node.data) node.data = {};
              if (!node.data.label) node.data.label = node.type;
              node.data.runStatus = "idle";
              node.data.connectedInputs = [];
            }
          }

          const nodes = workflow.nodes || [];
          if (workflow.edges && Array.isArray(workflow.edges)) {
            const nodeIds = new Set(nodes.map(n => n.id));
            const cleanedEdges: NonNullable<RawEdge>[] = workflow.edges
              .map(e => {
                if (!e || !nodeIds.has(e.source) || !nodeIds.has(e.target)) return null;
                // Fix source handle — always "output"
                e.sourceHandle = "output";
                // Fix target handle via aliases
                if (e.targetHandle && HANDLE_ALIASES[e.targetHandle]) {
                  e.targetHandle = HANDLE_ALIASES[e.targetHandle];
                }
                // Validate target handle exists for the target node type
                const targetNode = nodes.find(n => n.id === e.target);
                if (targetNode) {
                  const validInputs = VALID_HANDLES[targetNode.type]?.inputs || [];
                  if (validInputs.length > 0 && e.targetHandle && !validInputs.includes(e.targetHandle)) {
                    e.targetHandle = validInputs[0]; // Default to first valid input
                  }
                }
                return e;
              })
              .filter((e): e is NonNullable<RawEdge> => e !== null);
            workflow.edges = cleanedEdges;

            // Populate connectedInputs on nodes
            for (const edge of cleanedEdges) {
              const targetNode = nodes.find(n => n.id === edge.target);
              if (targetNode?.data && edge.targetHandle && !targetNode.data.connectedInputs?.includes(edge.targetHandle)) {
                targetNode.data.connectedInputs = [...(targetNode.data.connectedInputs || []), edge.targetHandle];
              }
            }
          }

          return NextResponse.json(workflow);
        } catch {
          console.error("Failed to parse AI workflow output:", text);
          return NextResponse.json({ error: "The AI returned something we couldn't read. Try rephrasing your description." }, { status: 502 });
        }
      }
      if (["FAILED", "CANCELED", "CRASHED", "SYSTEM_FAILURE", "TIMED_OUT", "EXPIRED"].includes(r.status)) {
        return NextResponse.json({ error: "Workflow generation failed. Please try again." }, { status: 502 });
      }
      await new Promise(res => setTimeout(res, 1000));
    }

    return NextResponse.json({ error: "Generation timed out — is the Trigger.dev worker running? (npm run dev:all)" }, { status: 504 });
  } catch (error) {
    console.error("[API/Workflow/Generate] Error:", error);
    return NextResponse.json({ error: "Couldn't reach the AI service. Please try again." }, { status: 500 });
  }
}
