import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks, runs } from "@trigger.dev/sdk/v3";
import { prisma, withRetry } from "@/lib/prisma";

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
    return val.imageUrl || val.videoUrl || val.url || val.output || "";
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
        if (["imageUrl", "image_url", "video_url", "user_message", "system_prompt"].includes(edge.targetHandle)) {
          const extracted = extractStringUrl(raw);
          if (extracted) {
            resolved[edge.targetHandle] = extracted;
            console.log(`[resolveInputs] ${edge.source}.${edge.sourceHandle} → ${node.id}.${edge.targetHandle} = "${extracted.slice(0, 60)}..."`);
          }
        } else if (edge.targetHandle === "images") {
          const url = extractStringUrl(raw);
          resolved.images = [...(resolved.images || []), url || raw];
        } else {
          resolved[edge.targetHandle] = raw;
        }
      }
    }
  }
  return resolved;
}

async function triggerPolled(taskId: string, payload: any): Promise<any> {
  // @ts-ignore — tasks.trigger typing is loose
  const handle = await tasks.trigger(taskId, payload);
  const maxWait = 300_000; // 5 minutes
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const r = await runs.retrieve(handle.id);
    if (r.status === "COMPLETED") return { ok: true, output: r.output };
    if (r.status === "FAILED" || r.status === "CANCELED" || r.status === "SYSTEM_FAILURE" || r.status === "CRASHED" || r.status === "TIMED_OUT") return { ok: false, error: r.status };
    await new Promise(res => setTimeout(res, 1500));
  }
  return { ok: false, error: "POLLING_TIMEOUT" };
}

async function executeNode(node: AppNode, inputs: Record<string, any>, workflowRunId: string): Promise<Record<string, any>> {
  const base = { nodeId: node.id, workflowRunId };
  switch (node.type) {
    case "text": return { output: inputs.text || "" };
    case "upload-image": {
      if (!inputs.fileData && !inputs.fileUrl) throw new Error("No image provided");
      const r = await triggerPolled("upload-image-node", { ...base, fileData: inputs.fileData, fileUrl: inputs.fileUrl, fileName: inputs.fileName || "image.jpg", mimeType: inputs.mimeType || "image/jpeg" });
      if (!r.ok) throw new Error(`Upload image failed: ${r.error}`);
      const o = r.output as any;
      if (!o?.imageUrl) throw new Error("Upload succeeded but no URL returned");
      return { output: o.imageUrl, imageUrl: o.imageUrl, thumbnailUrl: o.thumbnailUrl };
    }
    case "upload-video": {
      if (!inputs.fileData && !inputs.fileUrl) throw new Error("No video provided");
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
      const r = await triggerPolled("llm-node", { ...base, model: inputs.model || "llama-3.3-70b-versatile", system_prompt: inputs.system_prompt, user_message: finalMsg, images });
      if (!r.ok) throw new Error(`LLM failed: ${r.error}`);
      const o = r.output as any;
      return { output: o?.text || "", text: o?.text || "" };
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
    default: throw new Error(`Unknown node type: ${node.type}`);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
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
  if (runMode === "selected" && selectedNodeIds.length > 0) activeNodes = nodes.filter((n: AppNode) => selectedNodeIds.includes(n.id));

  const run = await withRetry(() => prisma.workflowRun.create({ data: { workflowId: id, userId, status: "running", runMode, selectedNodeIds, startedAt: new Date() } }));

  const nodeOutputs = new Map<string, Record<string, any>>();
  const nodeResults: Record<string, any> = {};
  const layers = topologicalSort(activeNodes, edges || []);
  const startTime = Date.now();
  let overallStatus: "success" | "failed" | "partial" = "success";

  for (const layer of layers) {
    await Promise.allSettled(layer.map(async (node) => {
      const nodeStart = Date.now();
      const nodeRun = await withRetry(() => prisma.nodeRun.create({ data: { workflowRunId: run.id, nodeId: node.id, nodeType: node.type, nodeLabel: node.data?.label, status: "running", startedAt: new Date() } }));
      try {
        const inputs = resolveInputs(node, edges || [], nodeOutputs);
        const output = await executeNode(node, inputs, run.id);
        nodeOutputs.set(node.id, output);
        nodeResults[node.id] = { status: "success", output };
        await withRetry(() => prisma.nodeRun.update({ where: { id: nodeRun.id }, data: { status: "success", output: output as any, duration: Date.now() - nodeStart, completedAt: new Date() } }));
      } catch (err: any) {
        console.error(`[Node ${node.id}] Execution failed:`, err?.message || err);
        overallStatus = "partial";
        nodeResults[node.id] = { status: "failed", error: err?.message || "Unknown error" };
        await withRetry(() => prisma.nodeRun.update({ where: { id: nodeRun.id }, data: { status: "failed", error: err?.message || "Unknown error", duration: Date.now() - nodeStart, completedAt: new Date() } }));
      }
    }));
  }

  const statuses = Object.values(nodeResults).map((r: any) => r.status);
  if (statuses.every(s => s === "failed")) overallStatus = "failed";
  if (statuses.every(s => s === "success")) overallStatus = "success";

  await withRetry(() => prisma.workflowRun.update({ where: { id: run.id }, data: { status: overallStatus, completedAt: new Date(), duration: Date.now() - startTime } }));
  return NextResponse.json({ runId: run.id, status: overallStatus, nodeResults });
}
