import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks, runs } from "@trigger.dev/sdk/v3";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Increase serverless function timeout (Vercel: free=60s, pro=300s)
export const maxDuration = 60;

// Simple in-memory LLM cache — avoids re-calling Groq for identical inputs
const LLM_CACHE = new Map<string, { output: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX = 100;
function llmCacheKey(model: string, systemPrompt: string | undefined, userMessage: string, images?: string[]): string {
  return JSON.stringify({ m: model, s: systemPrompt || "", u: userMessage, i: images || [] });
}

type AppNode = { id: string; type: string; position: { x: number; y: number }; data: Record<string, any> };
type AppEdge = { id: string; source: string; sourceHandle: string; target: string; targetHandle: string };

function topologicalSort(nodes: AppNode[], edges: AppEdge[]): AppNode[][] {
  const dependents = new Map<string, Set<string>>();
  const inCount = new Map<string, number>();
  for (const n of nodes) { dependents.set(n.id, new Set()); inCount.set(n.id, 0); }
  for (const e of edges) {
    if (dependents.has(e.source) && inCount.has(e.target)) {
      dependents.get(e.source)!.add(e.target);
      inCount.set(e.target, (inCount.get(e.target) || 0) + 1);
    }
  }
  const layers: AppNode[][] = [];
  let current = nodes.filter(n => inCount.get(n.id) === 0);
  while (current.length > 0) {
    layers.push(current);
    const next: AppNode[] = [];
    for (const node of current) {
      for (const depId of dependents.get(node.id) || []) {
        const cnt = (inCount.get(depId) || 0) - 1;
        inCount.set(depId, cnt);
        if (cnt === 0) { const dep = nodes.find(n => n.id === depId); if (dep) next.push(dep); }
      }
    }
    current = next;
  }
  return layers;
}

/** Extract a string URL from a value — only used for legacy edge cases */
function extractStringUrl(val: any): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") {
    return val.imageUrl || val.videoUrl || val.url || val.output || val.text || "";
  }
  return "";
}

function resolveInputs(node: AppNode, edges: AppEdge[], outputs: Map<string, Record<string, any>>): Record<string, any> {
  const resolved: Record<string, any> = { ...node.data };
  for (const edge of edges.filter(e => e.target === node.id)) {
    const srcOut = outputs.get(edge.source);
    if (srcOut) {
      const raw = srcOut[edge.sourceHandle] ?? srcOut.output;
      if (raw !== undefined) {
        // For URL-carrying handles, always flatten to string
        if (["imageUrl", "image_url", "video_url", "user_message", "system_prompt", "prompt"].includes(edge.targetHandle)) {
          const extracted = extractStringUrl(raw);
          if (extracted) {
            resolved[edge.targetHandle] = extracted;
            console.log(`[resolveInputs] ${edge.source}.${edge.sourceHandle} → ${node.id}.${edge.targetHandle} = "${extracted.slice(0, 60)}..."`);
          }
        } else if (edge.targetHandle === "images") {
          const url = extractStringUrl(raw);
          if (url) {
            resolved.images = [...(resolved.images || []), url];
          } else if (typeof raw === "string" && raw.startsWith("http")) {
            resolved.images = [...(resolved.images || []), raw];
          }
        } else {
          resolved[edge.targetHandle] = raw;
        }
      }
    }
  }
  return resolved;
}

async function triggerPolled(taskId: string, payload: any): Promise<any> {
  const start = Date.now();
  try {
    // tasks.triggerAndPoll is the correct method for Next.js API routes
    // (triggerAndWait only works INSIDE another Trigger.dev task)
    // @ts-ignore — tasks.triggerAndPoll typing is loose
    const run = await tasks.triggerAndPoll(taskId, payload, { pollIntervalMs: 500 });
    const elapsed = Date.now() - start;
    console.log(`[triggerPolled] ${taskId} completed in ${elapsed}ms, status: ${run.status}`);
    if (run.status === "COMPLETED") {
      return { ok: true, output: run.output };
    }
    return { ok: false, error: run.status || "TASK_FAILED" };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    console.error(`[triggerPolled] ${taskId} error after ${elapsed}ms:`, err?.message);
    // Fallback to manual trigger + poll
    return triggerPolledFallback(taskId, payload);
  }
}

async function triggerPolledFallback(taskId: string, payload: any): Promise<any> {
  console.log(`[triggerPolledFallback] Starting fallback for ${taskId}`);
  // @ts-ignore
  const handle = await tasks.trigger(taskId, payload);
  console.log(`[triggerPolledFallback] ${taskId} triggered, handle: ${handle.id}`);
  const maxWait = 300_000;
  const start = Date.now();
  let delay = 500;
  while (Date.now() - start < maxWait) {
    const r = await runs.retrieve(handle.id);
    if (r.status === "COMPLETED") {
      console.log(`[triggerPolledFallback] ${taskId} completed in ${Date.now() - start}ms`);
      return { ok: true, output: r.output };
    }
    if (["FAILED", "CANCELED", "SYSTEM_FAILURE", "CRASHED", "TIMED_OUT"].includes(r.status)) {
      console.error(`[triggerPolledFallback] ${taskId} failed with status: ${r.status}`);
      return { ok: false, error: r.status };
    }
    await new Promise(res => setTimeout(res, delay));
    delay = Math.min(delay * 1.5, 3000);
  }
  return { ok: false, error: "POLLING_TIMEOUT" };
}

async function executeNode(node: AppNode, inputs: Record<string, any>, workflowRunId: string, edges: AppEdge[] = [], nodes: AppNode[] = []): Promise<Record<string, any>> {
  const base = { nodeId: node.id, workflowRunId };
  switch (node.type) {
    case "text": return { output: inputs.text || "" };
    case "upload-image": {
      // If already pre-uploaded to CDN (new flow), just return the URL
      if (inputs.fileUrl && typeof inputs.fileUrl === "string" && inputs.fileUrl.startsWith("http")) {
        console.log(`[upload-image] Using pre-uploaded URL: ${inputs.fileUrl.slice(0, 60)}...`);
        return { output: inputs.fileUrl, imageUrl: inputs.fileUrl, thumbnailUrl: inputs.thumbnailUrl };
      }
      // Legacy: upload via Trigger.dev task (local dev or fileData still present)
      if (!inputs.fileData) throw new Error("No image provided. Please upload a file first.");
      const r = await triggerPolled("upload-image-node", { ...base, fileData: inputs.fileData, fileUrl: inputs.fileUrl, fileName: inputs.fileName || "image.jpg", mimeType: inputs.mimeType || "image/jpeg" });
      if (!r.ok) throw new Error(`Upload image failed: ${r.error}`);
      const o = r.output as any;
      if (!o?.imageUrl) throw new Error("Upload succeeded but no URL returned");
      return { output: o.imageUrl, imageUrl: o.imageUrl, thumbnailUrl: o.thumbnailUrl };
    }
    case "upload-video": {
      // If already pre-uploaded to CDN (new flow), just return the URL
      if (inputs.fileUrl && typeof inputs.fileUrl === "string" && inputs.fileUrl.startsWith("http")) {
        console.log(`[upload-video] Using pre-uploaded URL: ${inputs.fileUrl.slice(0, 60)}...`);
        return { output: inputs.fileUrl, videoUrl: inputs.fileUrl, thumbnailUrl: inputs.thumbnailUrl };
      }
      // Legacy: upload via Trigger.dev task
      if (!inputs.fileData) throw new Error("No video provided. Please upload a file first.");
      const r = await triggerPolled("upload-video-node", { ...base, fileData: inputs.fileData, fileUrl: inputs.fileUrl, fileName: inputs.fileName || "video.mp4", mimeType: inputs.mimeType || "video/mp4" });
      if (!r.ok) throw new Error(`Upload video failed: ${r.error}`);
      const o = r.output as any;
      if (!o?.videoUrl) throw new Error("Upload succeeded but no URL returned");
      return { output: o.videoUrl, videoUrl: o.videoUrl };
    }
    case "llm": {
      const images = inputs.images ? (Array.isArray(inputs.images) ? inputs.images : [inputs.images]) : undefined;
      const userMsg = inputs.user_message || inputs.output;
      const finalMsg = userMsg && typeof userMsg === "string" && userMsg.trim().length > 0 ? userMsg : "Hello";
      const hasImages = images && images.length > 0;
      const baseModel = inputs.model || "llama-3.1-8b-instant";
      const model = hasImages ? "meta-llama/llama-4-scout-17b-16e-instruct" : baseModel;
      // Check cache
      const cKey = llmCacheKey(model, inputs.system_prompt, finalMsg, images);
      const cached = LLM_CACHE.get(cKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[cache] LLM cache HIT for ${node.id}`);
        return cached.output;
      }
      const r = await triggerPolled("llm-node", { ...base, model, system_prompt: inputs.system_prompt, user_message: finalMsg, images });
      if (!r.ok) throw new Error(`LLM failed: ${r.error}`);
      const o = r.output as any;
      const result = { output: o?.text || "", text: o?.text || "" };
      // Store in cache
      if (LLM_CACHE.size >= CACHE_MAX) { const firstKey = LLM_CACHE.keys().next().value; if (firstKey) LLM_CACHE.delete(firstKey); }
      LLM_CACHE.set(cKey, { output: result, timestamp: Date.now() });
      return result;
    }
    case "crop-image": {
      const imageUrl = inputs.imageUrl || inputs.image_url || inputs.output;
      console.log("[crop-image] imageUrl resolved:", imageUrl);
      if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("http")) throw new Error(`Image URL is missing or invalid (got ${typeof imageUrl}: ${JSON.stringify(imageUrl).slice(0, 100)}). Connect an image source to this node.`);
      const r = await triggerPolled("crop-image-node", { ...base, imageUrl, x_percent: Number(inputs.x_percent ?? 0), y_percent: Number(inputs.y_percent ?? 0), width_percent: Number(inputs.width_percent ?? 100), height_percent: Number(inputs.height_percent ?? 100) });
      if (!r.ok) throw new Error(`Crop failed: ${r.error}`);
      const o = r.output as any;
      if (!o?.imageUrl) throw new Error("Crop succeeded but no URL returned");
      return { output: o.imageUrl, imageUrl: o.imageUrl, width: o.width, height: o.height };
    }
    case "extract-frame": {
      const videoUrl = inputs.video_url || inputs.output;
      console.log("[extract-frame] videoUrl resolved:", videoUrl);
      console.log("[extract-frame] timestamp:", inputs.timestamp, "type:", typeof inputs.timestamp);
      if (!videoUrl || typeof videoUrl !== "string" || !videoUrl.startsWith("http")) throw new Error(`Video URL is missing or invalid (got ${typeof videoUrl}: ${JSON.stringify(videoUrl).slice(0, 100)}). Connect a video source to this node.`);
      const r = await triggerPolled("extract-frame-node", { ...base, video_url: videoUrl, timestamp: inputs.timestamp ?? 0 });
      if (!r.ok) throw new Error(`Extract frame failed: ${r.error}`);
      const o = r.output as any;
      if (!o?.imageUrl) throw new Error("Frame extraction succeeded but no URL returned");
      return { output: o.imageUrl, imageUrl: o.imageUrl, width: o.width, height: o.height };
    }
    case "generate-image": {
      const rawPrompt = inputs.prompt || inputs.output || "";
      if (!rawPrompt) throw new Error("No prompt provided for image generation.");
      
      // Sanitize prompt: remove newlines, multiple spaces, and limit length for stability
      let sanitizedPrompt = rawPrompt.replace(/[\n\r]/g, " ").replace(/\s+/g, " ").trim();
      if (sanitizedPrompt.length > 500) sanitizedPrompt = sanitizedPrompt.slice(0, 500) + "...";

      const RATIO_DIMENSIONS: Record<string, {w:number,h:number}> = {
        '1:1': {w:768,h:768},
        '4:3': {w:768,h:576},
        '16:9': {w:768,h:432},
        '9:16': {w:432,h:768},
      };
      const {w, h} = RATIO_DIMENSIONS[inputs.aspectRatio || '1:1'];

      const STYLE_SUFFIXES: Record<string,string> = {
        'Default': '',
        'Cinematic': ', cinematic lighting, film grain, anamorphic lens, movie still',
        'Hyper-Realistic': ', hyperrealistic, photorealistic, DSLR, 8k, sharp focus',
        'Anime': ', anime style, Studio Ghibli, detailed illustration, vibrant colors',
        'Artistic': ', oil painting, artistic, textured, creative composition',
        'Product Photography': ', product photography, white background, studio lighting, commercial',
      };
      const suffix = STYLE_SUFFIXES[inputs.style || 'Default'];
      const finalPrompt = sanitizedPrompt + suffix;

      const seed = Math.floor(Math.random() * 1000000) + Date.now() % 1000;
      const model = inputs.model || "flux";

      // Function to attempt generation/validation
      const tryGenerate = async (p: string) => {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=${w}&height=${h}&model=${model}&seed=${seed}&nologo=true&private=true`;
        console.log(`[generate-image] Attempting URL: ${url}`);
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (res.ok) return url;
          console.warn(`[generate-image] Pollinations returned ${res.status} for prompt: ${p.slice(0, 50)}...`);
          return null;
        } catch (err) {
          console.warn(`[generate-image] Fetch failed for prompt: ${p.slice(0, 50)}...`, err);
          return null;
        }
      };

      // Try with full prompt
      let finalUrl = await tryGenerate(finalPrompt);
      
      // If failed, retry with simplified prompt (first 100 chars or just the core subject)
      if (!finalUrl) {
        console.log(`[generate-image] Retrying with simplified prompt...`);
        const simplified = finalPrompt.split(",").slice(0, 3).join(",").slice(0, 150);
        finalUrl = await tryGenerate(simplified);
      }

      if (!finalUrl) {
        throw new Error("Generation servers are busy. Please try again with a simpler prompt.");
      }

      return { output: finalUrl, imageUrl: finalUrl, prompt: sanitizedPrompt, seed, width: w, height: h };
    }
    case "prompt-enhancer": {
      const rawPrompt = inputs.prompt || inputs.output || "";
      if (!rawPrompt) throw new Error("No prompt provided to enhance.");
      const style = inputs.style || "Cinematic";
      
      // Determine what this node connects to downstream
      const targetNodeIds = edges.filter(e => e.source === node.id).map(e => e.target);
      const targetNodes = nodes.filter(n => targetNodeIds.includes(n.id));
      const connectsToImage = targetNodes.some(n => n.type === "generate-image");
      const connectsToVideo = false; // generate-video node removed
      
      let systemPrompt = "";
      
      if (connectsToVideo && !connectsToImage) {
        systemPrompt = `You are a professional prompt engineer for AI video generators (Seedance, Sora, Runway).
Your task is to transform a raw user request into a CONCISE, powerful, one-line prompt for video generation.

STRATEGY:
- Subject: Clear, prominent, and in motion
- Action/Motion: What is happening? Describe the movement clearly (e.g. "camera panning", "character walking", "wind blowing")
- Environment: Specific setting and background
- Lighting: Atmospheric lighting style
- Style: ${style}
- Composition: Camera angle and depth of field
- Quality: Keywords like "photorealistic", "highly detailed", "8k", "smooth motion", "cinematic video"

CONSTRAINTS:
- Keep the result between 30 and 60 words.
- Use comma-separated descriptive phrases.
- DO NOT use full sentences or paragraphs.
- DO NOT include explanations, quotes, or conversational text.
- RETURN ONLY THE ENHANCED PROMPT.

Transform this into a detailed ${style} AI video generation prompt: "${rawPrompt}"`;
      } else {
        systemPrompt = `You are a professional prompt engineer for AI image generators (Stable Diffusion, Flux, Midjourney).
Your task is to transform a raw user request into a CONCISE, powerful, one-line prompt.

STRATEGY:
- Subject: Clear and prominent
- Environment: Specific setting and background
- Lighting: Atmospheric lighting style
- Style: ${style}
- Composition: Camera angle and depth of field
- Quality: Keywords like "photorealistic", "highly detailed", "8k"

CONSTRAINTS:
- Keep the result between 30 and 50 words.
- Use comma-separated descriptive phrases.
- DO NOT use full sentences or paragraphs.
- DO NOT include explanations, quotes, or conversational text.
- RETURN ONLY THE ENHANCED PROMPT.

Transform this into a detailed ${style} AI image generation prompt: "${rawPrompt}"`;
      }
      
      const r = await triggerPolled("llm-node", { ...base, model: "llama-3.1-8b-instant", system_prompt: systemPrompt, user_message: rawPrompt });
      if (!r.ok) throw new Error(`Prompt enhancement failed: ${r.error}`);
      
      let text = (r.output as any)?.text || "";
      // Post-process: remove quotes, newlines, and ensure one-liner
      text = text.replace(/["']/g, "").replace(/[\n\r]/g, " ").replace(/\s+/g, " ").trim();
      
      return { output: text, text };
    }
    case "video-enhance": {
      const videoUrl = inputs.video_url || inputs.output || "";
      if (!videoUrl) throw new Error("No video URL provided for Video Enhance node.");
      const r = await triggerPolled("video-enhance-node", {
        ...base,
        video_url: videoUrl,
        resolution: inputs.resolution || "1080p",
        strength: inputs.strength || "medium",
      });
      if (!r.ok) throw new Error(`Video enhance failed: ${r.error}`);
      const o = r.output as any;
      if (!o?.videoUrl) throw new Error("Video enhance succeeded but no URL returned");
      return { output: o.videoUrl, videoUrl: o.videoUrl };
    }
    default: throw new Error(`Unknown node type: ${node.type}`);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Workflow/Run] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflow = await withRetry(() => prisma.workflow.findFirst({ where: { id, userId } }));
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Safe JSON parse
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const { nodes, edges, runMode = "full", selectedNodeIds = [] } = body;

  if (!nodes || !Array.isArray(nodes)) {
    return NextResponse.json({ error: "Missing or invalid nodes array" }, { status: 400 });
  }

  let activeNodes: AppNode[] = nodes;
  if ((runMode === "selected" || runMode === "single") && selectedNodeIds.length > 0) {
    activeNodes = nodes.filter((n: AppNode) => selectedNodeIds.includes(n.id));
  }

  // ─── SSE Streaming Response ───
  // Each node's start/completion is pushed incrementally so the frontend
  // can update pulsing and results per-node instead of waiting for everything.

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { /* client disconnected */ }
      };

      try {
        const run = await withRetry(() => prisma.workflowRun.create({ data: { workflowId: id, userId: userId!, status: "running", runMode, selectedNodeIds, startedAt: new Date() } }));
        send("run-start", { runId: run.id });

        const nodeOutputs = new Map<string, Record<string, any>>();
        // Seed nodeOutputs with current data from the request body
        // This allows single/partial runs to use results from previously executed nodes
        for (const n of nodes) {
          if (n.data?.runOutput) {
            nodeOutputs.set(n.id, n.data.runOutput);
          }
        }
        const nodeResults: Record<string, any> = {};
        const layers = topologicalSort(activeNodes, edges || []);
        const startTime = Date.now();
        let overallStatus: "success" | "failed" | "partial" = "success";

        for (const layer of layers) {
          // Tell frontend which nodes are starting NOW (this layer only)
          for (const node of layer) {
            send("node-start", { nodeId: node.id, nodeType: node.type, nodeLabel: node.data?.label });
          }

          const layerStart = Date.now();
          await Promise.allSettled(layer.map(async (node) => {
            const nodeStart = Date.now();
            const nodeRun = await withRetry(() => prisma.nodeRun.create({ data: { workflowRunId: run.id, nodeId: node.id, nodeType: node.type, nodeLabel: node.data?.label, status: "running", startedAt: new Date() } }));
            try {
              const inputs = resolveInputs(node, edges || [], nodeOutputs);
              const output = await executeNode(node, inputs, run.id, edges || [], activeNodes);
              const nodeDuration = Date.now() - nodeStart;
              console.log(`[perf] Node ${node.id} (${node.type}) completed in ${nodeDuration}ms`);
              nodeOutputs.set(node.id, output);
              nodeResults[node.id] = { status: "success", output, duration: nodeDuration };
              await withRetry(() => prisma.nodeRun.update({ where: { id: nodeRun.id }, data: { status: "success", output: output as any, duration: nodeDuration, completedAt: new Date() } }));
              // Push result to frontend immediately
              send("node-complete", { nodeId: node.id, status: "success", output, duration: nodeDuration });
            } catch (err: any) {
              const nodeDuration = Date.now() - nodeStart;
              console.error(`[perf] Node ${node.id} (${node.type}) FAILED in ${nodeDuration}ms:`, err?.message || err);
              overallStatus = "partial";
              nodeResults[node.id] = { status: "failed", error: err?.message || "Unknown error", duration: nodeDuration };
              await withRetry(() => prisma.nodeRun.update({ where: { id: nodeRun.id }, data: { status: "failed", error: err?.message || "Unknown error", duration: nodeDuration, completedAt: new Date() } }));
              // Push failure to frontend immediately
              send("node-complete", { nodeId: node.id, status: "failed", error: err?.message || "Unknown error", duration: nodeDuration });
            }
          }));
          console.log(`[perf] Layer completed in ${Date.now() - layerStart}ms (${layer.length} nodes)`);
        }

        const totalDuration = Date.now() - startTime;
        const statuses = Object.values(nodeResults).map((r: any) => r.status);
        if (statuses.every(s => s === "failed")) overallStatus = "failed";
        if (statuses.every(s => s === "success")) overallStatus = "success";

        console.log(`[perf] Total workflow run completed in ${totalDuration}ms — ${statuses.filter(s => s === "success").length}/${statuses.length} nodes succeeded`);
        await withRetry(() => prisma.workflowRun.update({ where: { id: run.id }, data: { status: overallStatus, completedAt: new Date(), duration: totalDuration } }));
        send("workflow-complete", { runId: run.id, status: overallStatus, duration: totalDuration, nodeResults });
      } catch (err: any) {
        console.error("[API/Workflow/Run] Stream error:", err?.message || err);
        send("error", { error: err?.message || "Unknown execution error" });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
