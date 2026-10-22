"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { NODE_HANDLES, NodeType, AppNode, AppEdge } from "@nextflow/shared/types";
import { toast } from "@/components/ui/toast";

export type RunMode = "full" | "selected" | "single";
export type RunProgress = { done: number; total: number; failed: number } | null;

/** Values a node needs before it can run — mirrors the worker's own checks so we fail fast, client-side. */
function missingInput(node: AppNode, edges: AppEdge[]): string | null {
  const wired = (h: string) => edges.some(e => e.target === node.id && e.targetHandle === h);
  const d = node.data;
  const has = (v: unknown) => typeof v === "string" ? v.trim().length > 0 : v != null;
  switch (node.type) {
    case "text": return has(d.text) ? null : "is empty";
    case "upload-image": case "upload-video": return has(d.fileUrl) ? null : `has no ${node.type === "upload-image" ? "image" : "video"} uploaded yet`;
    case "llm": return wired("user_message") || has(d.user_message) || wired("images") ? null : "needs a user message";
    case "crop-image": return wired("imageUrl") || has(d.imageUrl) ? null : "needs an image";
    case "extract-frame": case "video-enhance": return wired("video_url") || has(d.video_url) ? null : "needs a video";
    case "generate-image": case "prompt-enhancer": return wired("prompt") || has(d.prompt) ? null : "needs a prompt";
    default: return NODE_HANDLES[node.type as NodeType] ? null : "is an unknown node type";
  }
}

/**
 * Owns starting a run and polling it to completion. The run itself executes in the
 * "run-workflow" Trigger.dev task, so polling is the only thing keeping the UI in sync.
 */
export function useWorkflowRunner() {
  const [progress, setProgress] = useState<RunProgress>(null);
  const abortRef = useRef(false);
  useEffect(() => () => { abortRef.current = true; }, []);

  const pollRun = useCallback(async (workflowId: string, runId: string, total: number) => {
    const seen = new Map<string, string>();
    const start = Date.now();
    let failures = 0;
    while (Date.now() - start < 10 * 60 * 1000) {
      if (abortRef.current) return "aborted";
      let run: { status: string; nodeRuns?: { nodeId: string; status: string; output?: unknown; error?: string }[] };
      try {
        const res = await fetch(`/api/workflow/${workflowId}/run/${runId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        run = (await res.json()).run;
        failures = 0;
      } catch {
        // Tolerate a few transient network blips before giving up on the poll.
        if (++failures >= 5) throw new Error("Lost connection while checking the run. It may still finish — check Run history.");
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      const store = useWorkflowStore.getState();
      for (const nr of run.nodeRuns || []) {
        if (seen.get(nr.nodeId) === nr.status) continue;
        seen.set(nr.nodeId, nr.status);
        if (nr.status === "running") store.updateNodeData(nr.nodeId, { isRunning: true, runStatus: "running", runError: undefined });
        else if (nr.status === "success") store.setNodeResult(nr.nodeId, "success", nr.output, undefined);
        else if (nr.status === "failed") store.setNodeResult(nr.nodeId, "failed", undefined, nr.error);
      }
      const done = (run.nodeRuns || []).filter(n => n.status !== "running").length;
      const failed = (run.nodeRuns || []).filter(n => n.status === "failed").length;
      setProgress({ done, total, failed });
      if (run.status !== "running") return run.status;
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error("This run is taking unusually long — check Run history for its final status.");
  }, []);

  const run = useCallback(async (mode: RunMode = "full", overrideIds?: string[]) => {
    const store = useWorkflowStore.getState();
    const { isRunning, workflowId, nodes, edges, cooldownEnd } = store;
    if (isRunning || !workflowId) return;
    if (nodes.length === 0) { toast.info("Add a node before running."); return; }

    let ids: string[] = [];
    if (mode === "selected") ids = nodes.filter(n => n.selected).map(n => n.id);
    if (mode === "single") ids = overrideIds ?? [];
    if (mode !== "full" && ids.length === 0) { toast.info("Select one or more nodes first."); return; }
    const active = mode === "full" ? nodes : nodes.filter(n => ids.includes(n.id));

    // Inputs that come from a node *outside* this run must already have a result to reuse.
    const activeIds = new Set(active.map(n => n.id));
    for (const n of active) {
      const upstreamMissing = edges.find(e => {
        if (e.target !== n.id || activeIds.has(e.source)) return false;
        const src = nodes.find(x => x.id === e.source);
        if (!src || src.data.runOutput !== undefined) return false;
        // Text/upload nodes are read directly by the worker (see runWorkflowTask).
        if (src.type === "text") return !src.data.text;
        if (src.type === "upload-image" || src.type === "upload-video") return !src.data.fileUrl;
        return true;
      });
      if (upstreamMissing) {
        const src = nodes.find(x => x.id === upstreamMissing.source);
        toast.warning(`“${n.data.label}” needs “${src?.data.label ?? "its input"}” to run first. Run the full workflow, or include it in the selection.`);
        window.dispatchEvent(new CustomEvent("canvas-focus-node", { detail: { nodeId: n.id } }));
        return;
      }
      const problem = missingInput(n, edges);
      if (problem) {
        toast.warning(`“${n.data.label || n.type}” ${problem}.`);
        window.dispatchEvent(new CustomEvent("canvas-focus-node", { detail: { nodeId: n.id } }));
        return;
      }
    }

    if (active.some(n => n.type === "generate-image") && cooldownEnd > Date.now()) {
      toast.warning(`Image generation is cooling down — try again in ${Math.ceil((cooldownEnd - Date.now()) / 1000)}s.`);
      return;
    }

    store.resetNodeStates(mode === "full" ? undefined : ids);
    store.setIsRunning(true);
    setProgress({ done: 0, total: active.length, failed: 0 });
    try {
      // Send the pre-reset nodes: single/selected runs reuse upstream results from earlier runs.
      const payloadNodes = nodes.map(n => ({ ...n, selected: undefined, data: { ...n.data, fileData: undefined, previewUrl: undefined } }));
      const res = await fetch(`/api/workflow/${workflowId}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nodes: payloadNodes, edges, runMode: mode, selectedNodeIds: ids }) });
      if (!res.ok) { const t = await res.json().catch(() => ({})); throw new Error(t?.error || `Couldn't start the run (${res.status})`); }
      const { runId } = await res.json();
      store.setCurrentRunId(runId);
      const status = await pollRun(workflowId, runId, active.length);
      if (status === "success") toast.success(mode === "full" ? "Workflow finished successfully." : "Node finished.");
      else if (status === "failed") toast.error("Run failed — see the highlighted node for details.");
      else if (status === "partial") toast.warning("Run finished, but some nodes failed.");
      const runsRes = await fetch(`/api/workflow/${workflowId}/runs`, { cache: "no-store" });
      if (runsRes.ok) useWorkflowStore.getState().setRunHistory((await runsRes.json()).runs);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Workflow run failed.";
      toast.error(message);
      const s = useWorkflowStore.getState();
      for (const node of s.nodes) if (node.data.isRunning) s.setNodeResult(node.id, "failed", undefined, message);
    } finally {
      useWorkflowStore.getState().setIsRunning(false);
      useWorkflowStore.getState().setCurrentRunId(null);
      setProgress(null);
    }
  }, [pollRun]);

  useEffect(() => {
    const onSingle = (e: Event) => run("single", [(e as CustomEvent).detail.nodeId]);
    const onRun = (e: Event) => run(((e as CustomEvent).detail?.mode as RunMode) || "full");
    window.addEventListener("run-single-node", onSingle);
    window.addEventListener("canvas-run-workflow", onRun);
    return () => { window.removeEventListener("run-single-node", onSingle); window.removeEventListener("canvas-run-workflow", onRun); };
  }, [run]);

  return { run, progress };
}
