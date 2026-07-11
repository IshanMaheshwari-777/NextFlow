import { task, tasks, runs, logger } from "@trigger.dev/sdk/v3";
import { prisma, withRetry } from "../lib/prisma";
import { findCyclicNodeIds } from "../lib/graph";
import { topologicalSort, resolveInputs as resolveInputsPure, type AppNode, type AppEdge } from "../lib/workflowExecution";

export { topologicalSort };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see executeNode's dynamic-dispatch note below
export function resolveInputs(node: AppNode, edges: AppEdge[], outputs: Map<string, Record<string, any>>): Record<string, any> {
  return resolveInputsPure(node, edges, outputs, warning => logger.warn(warning.message, { nodeId: warning.nodeId }));
}

type TaskResult = { ok: true; output: Record<string, unknown> } | { ok: false; error: string };

async function triggerPolled(taskId: string, payload: Record<string, unknown>): Promise<TaskResult> {
  const start = Date.now();
  try {
    const run = await tasks.triggerAndWait(taskId, payload);
    const elapsed = Date.now() - start;
    logger.info("triggerPolled completed", { taskId, elapsed, ok: run.ok });
    if (run.ok) return { ok: true, output: (run.output ?? {}) as Record<string, unknown> };
    return { ok: false, error: (run as { error?: { message?: string } }).error?.message || "TASK_FAILED" };
  } catch (err) {
    const elapsed = Date.now() - start;
    logger.error("triggerPolled error, falling back to manual poll", { taskId, elapsed, error: err instanceof Error ? err.message : String(err) });
    return triggerPolledFallback(taskId, payload);
  }
}

async function triggerPolledFallback(taskId: string, payload: Record<string, unknown>): Promise<TaskResult> {
  const handle = await tasks.trigger(taskId, payload);
  const maxWait = 280_000;
  const start = Date.now();
  let delay = 500;
  while (Date.now() - start < maxWait) {
    const r = await runs.retrieve(handle.id);
    if (r.status === "COMPLETED") return { ok: true, output: (r.output ?? {}) as Record<string, unknown> };
    if (["FAILED", "CANCELED", "SYSTEM_FAILURE", "CRASHED", "TIMED_OUT"].includes(r.status)) {
      return { ok: false, error: r.status };
    }
    await new Promise(res => setTimeout(res, delay));
    delay = Math.min(delay * 1.5, 3000);
  }
  return { ok: false, error: "POLLING_TIMEOUT" };
}

// `inputs`/the return value are a merge of a node's own params with whatever its upstream
// edges produced — inherently heterogeneous across the 9 node types in this switch, the
// same way Prisma's `Json` columns that store them are. Typed as `any` deliberately here
// rather than fighting the type system at this one dynamic-dispatch boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeNode(node: AppNode, inputs: Record<string, any>, workflowRunId: string, edges: AppEdge[] = [], nodes: AppNode[] = []): Promise<Record<string, any>> {
  const base = { nodeId: node.id, workflowRunId };
  switch (node.type) {
    case "text": return { output: inputs.text || "" };
    case "upload-image": {
      if (inputs.fileUrl && typeof inputs.fileUrl === "string" && inputs.fileUrl.startsWith("http")) {
        return { output: inputs.fileUrl, imageUrl: inputs.fileUrl, thumbnailUrl: inputs.thumbnailUrl };
      }
      if (!inputs.fileData) throw new Error("No image provided. Please upload a file first.");
      const r = await triggerPolled("upload-image-node", { ...base, fileData: inputs.fileData, fileUrl: inputs.fileUrl, fileName: inputs.fileName || "image.jpg", mimeType: inputs.mimeType || "image/jpeg" });
      if (!r.ok) throw new Error(`Upload image failed: ${r.error}`);
      const o = r.output as { imageUrl?: string; thumbnailUrl?: string };
      if (!o?.imageUrl) throw new Error("Upload succeeded but no URL returned");
      return { output: o.imageUrl, imageUrl: o.imageUrl, thumbnailUrl: o.thumbnailUrl };
    }
    case "upload-video": {
      if (inputs.fileUrl && typeof inputs.fileUrl === "string" && inputs.fileUrl.startsWith("http")) {
        return { output: inputs.fileUrl, videoUrl: inputs.fileUrl, thumbnailUrl: inputs.thumbnailUrl };
      }
      if (!inputs.fileData) throw new Error("No video provided. Please upload a file first.");
      const r = await triggerPolled("upload-video-node", { ...base, fileData: inputs.fileData, fileUrl: inputs.fileUrl, fileName: inputs.fileName || "video.mp4", mimeType: inputs.mimeType || "video/mp4" });
      if (!r.ok) throw new Error(`Upload video failed: ${r.error}`);
      const o = r.output as { videoUrl?: string; thumbnailUrl?: string };
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
      const r = await triggerPolled("llm-node", { ...base, model, system_prompt: inputs.system_prompt, user_message: finalMsg, images });
      if (!r.ok) throw new Error(`LLM failed: ${r.error}`);
      const o = r.output as { text?: string };
      return { output: o?.text || "", text: o?.text || "" };
    }
    case "crop-image": {
      const imageUrl = inputs.imageUrl || inputs.image_url || inputs.output;
      if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("http")) throw new Error(`Image URL is missing or invalid (got ${typeof imageUrl}: ${JSON.stringify(imageUrl).slice(0, 100)}). Connect an image source to this node.`);
      const r = await triggerPolled("crop-image-node", { ...base, imageUrl, x_percent: Number(inputs.x_percent ?? 0), y_percent: Number(inputs.y_percent ?? 0), width_percent: Number(inputs.width_percent ?? 100), height_percent: Number(inputs.height_percent ?? 100) });
      if (!r.ok) throw new Error(`Crop failed: ${r.error}`);
      const o = r.output as { imageUrl?: string; width?: number; height?: number };
      if (!o?.imageUrl) throw new Error("Crop succeeded but no URL returned");
      return { output: o.imageUrl, imageUrl: o.imageUrl, width: o.width, height: o.height };
    }
    case "extract-frame": {
      const videoUrl = inputs.video_url || inputs.output;
      if (!videoUrl || typeof videoUrl !== "string" || !videoUrl.startsWith("http")) throw new Error(`Video URL is missing or invalid (got ${typeof videoUrl}: ${JSON.stringify(videoUrl).slice(0, 100)}). Connect a video source to this node.`);
      const r = await triggerPolled("extract-frame-node", { ...base, video_url: videoUrl, timestamp: inputs.timestamp ?? 0 });
      if (!r.ok) throw new Error(`Extract frame failed: ${r.error}`);
      const o = r.output as { imageUrl?: string; width?: number; height?: number };
      if (!o?.imageUrl) throw new Error("Frame extraction succeeded but no URL returned");
      return { output: o.imageUrl, imageUrl: o.imageUrl, width: o.width, height: o.height };
    }
    case "generate-image": {
      const rawPrompt = inputs.prompt || inputs.output || "";
      if (!rawPrompt) throw new Error("No prompt provided for image generation.");

      let sanitizedPrompt = rawPrompt.replace(/[\n\r]/g, " ").replace(/\s+/g, " ").trim();
      if (sanitizedPrompt.length > 500) sanitizedPrompt = sanitizedPrompt.slice(0, 500) + "...";

      const RATIO_DIMENSIONS: Record<string, { w: number; h: number }> = {
        "1:1": { w: 768, h: 768 },
        "4:3": { w: 768, h: 576 },
        "16:9": { w: 768, h: 432 },
        "9:16": { w: 432, h: 768 },
      };
      const { w, h } = RATIO_DIMENSIONS[inputs.aspectRatio || "1:1"];

      const STYLE_SUFFIXES: Record<string, string> = {
        Default: "",
        Cinematic: ", cinematic lighting, film grain, anamorphic lens, movie still",
        "Hyper-Realistic": ", hyperrealistic, photorealistic, DSLR, 8k, sharp focus",
        Anime: ", anime style, Studio Ghibli, detailed illustration, vibrant colors",
        Artistic: ", oil painting, artistic, textured, creative composition",
        "Product Photography": ", product photography, white background, studio lighting, commercial",
      };
      const suffix = STYLE_SUFFIXES[inputs.style || "Default"];
      const finalPrompt = sanitizedPrompt + suffix;

      const seed = Math.floor(Math.random() * 1000000) + (Date.now() % 1000);
      const model = inputs.model || "flux";

      const tryGenerate = async (p: string) => {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=${w}&height=${h}&model=${model}&seed=${seed}&nologo=true&private=true`;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) return url;
          return null;
        } catch {
          return null;
        }
      };

      let finalUrl = await tryGenerate(finalPrompt);
      if (!finalUrl) {
        const simplified = finalPrompt.split(",").slice(0, 3).join(",").slice(0, 150);
        finalUrl = await tryGenerate(simplified);
      }
      if (!finalUrl) throw new Error("Generation servers are busy. Please try again with a simpler prompt.");

      return { output: finalUrl, imageUrl: finalUrl, prompt: sanitizedPrompt, seed, width: w, height: h };
    }
    case "prompt-enhancer": {
      const rawPrompt = inputs.prompt || inputs.output || "";
      if (!rawPrompt) throw new Error("No prompt provided to enhance.");
      const style = inputs.style || "Cinematic";

      const targetNodeIds = edges.filter(e => e.source === node.id).map(e => e.target);
      const targetNodes = nodes.filter(n => targetNodeIds.includes(n.id));
      const connectsToImage = targetNodes.some(n => n.type === "generate-image");
      const connectsToVideo = false;

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

      let text = (r.output as { text?: string })?.text || "";
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
      const o = r.output as { videoUrl?: string };
      if (!o?.videoUrl) throw new Error("Video enhance succeeded but no URL returned");
      return { output: o.videoUrl, videoUrl: o.videoUrl };
    }
    default: throw new Error(`Unknown node type: ${node.type}`);
  }
}

const CYCLE_ERROR = "Skipped — this node is part of a dependency cycle. Remove the loop and run again.";

export const runWorkflowTask = task({
  id: "run-workflow",
  retry: { maxAttempts: 1 },
  run: async (payload: { workflowRunId: string; activeNodes: AppNode[]; allNodes: AppNode[]; edges: AppEdge[] }) => {
    const { workflowRunId, activeNodes, allNodes, edges } = payload;
    const nodeResults: Record<string, { status: "success" | "failed"; output?: Record<string, unknown>; error?: string; duration: number }> = {};
    let overallStatus: "success" | "failed" | "partial" = "success";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see executeNode's dynamic-dispatch note above
    const nodeOutputs = new Map<string, Record<string, any>>();
    for (const n of allNodes) {
      if (n.data?.runOutput) nodeOutputs.set(n.id, n.data.runOutput);
    }

    const cyclic = findCyclicNodeIds(activeNodes, edges);
    if (cyclic.size > 0) {
      logger.warn("Workflow contains a cycle — affected nodes will be skipped", { workflowRunId, nodeIds: Array.from(cyclic) });
      overallStatus = "partial";
      const cyclicNodes = activeNodes.filter(n => cyclic.has(n.id));
      for (const node of cyclicNodes) nodeResults[node.id] = { status: "failed", error: CYCLE_ERROR, duration: 0 };
      await withRetry(() => prisma.nodeRun.createMany({
        data: cyclicNodes.map(node => ({ workflowRunId, nodeId: node.id, nodeType: node.type, nodeLabel: node.data?.label, status: "failed", error: CYCLE_ERROR, startedAt: new Date(), completedAt: new Date(), duration: 0 })),
      }));
    }

    const acyclicNodes = activeNodes.filter(n => !cyclic.has(n.id));
    const layers = topologicalSort(acyclicNodes, edges);
    const startTime = Date.now();

    for (const layer of layers) {
      // One batched insert for the whole layer instead of N individual creates.
      const created = await withRetry(() => prisma.nodeRun.createManyAndReturn({
        data: layer.map(node => ({ workflowRunId, nodeId: node.id, nodeType: node.type, nodeLabel: node.data?.label, status: "running", startedAt: new Date() })),
      }));
      const nodeRunIdByNodeId = new Map(created.map(c => [c.nodeId, c.id]));

      await Promise.allSettled(layer.map(async (node) => {
        const nodeStart = Date.now();
        const nodeRunId = nodeRunIdByNodeId.get(node.id)!;
        try {
          const inputs = resolveInputs(node, edges, nodeOutputs);
          const output = await executeNode(node, inputs, workflowRunId, edges, acyclicNodes);
          const nodeDuration = Date.now() - nodeStart;
          nodeOutputs.set(node.id, output);
          nodeResults[node.id] = { status: "success", output, duration: nodeDuration };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma's Json column type doesn't structurally match our dynamic output shape
          await withRetry(() => prisma.nodeRun.update({ where: { id: nodeRunId }, data: { status: "success", output: output as any, duration: nodeDuration, completedAt: new Date() } }));
        } catch (err) {
          const nodeDuration = Date.now() - nodeStart;
          const message = err instanceof Error ? err.message : String(err);
          logger.error("Node failed", { nodeId: node.id, nodeType: node.type, error: message });
          nodeResults[node.id] = { status: "failed", error: message, duration: nodeDuration };
          await withRetry(() => prisma.nodeRun.update({ where: { id: nodeRunId }, data: { status: "failed", error: message, duration: nodeDuration, completedAt: new Date() } }));
        }
      }));
    }

    const totalDuration = Date.now() - startTime;
    const statuses = Object.values(nodeResults).map(r => r.status);
    if (statuses.length > 0 && statuses.every(s => s === "failed")) overallStatus = "failed";
    else if (statuses.length > 0 && statuses.every(s => s === "success")) overallStatus = "success";
    else if (statuses.some(s => s === "failed")) overallStatus = "partial";

    await withRetry(() => prisma.workflowRun.update({ where: { id: workflowRunId }, data: { status: overallStatus, completedAt: new Date(), duration: totalDuration } }));
    logger.info("Workflow run finished", { workflowRunId, overallStatus, totalDuration, nodeCount: Object.keys(nodeResults).length });

    return { status: overallStatus, nodeResults };
  },
});
