"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflowStore";
import { AppNode, AppEdge, WorkflowRunRecord } from "@nextflow/shared/types";
import WorkflowCanvas from "./WorkflowCanvas";
import TopBar from "@/components/layout/TopBar";
import NodePicker from "@/components/layout/NodePicker";
import RunHistoryPanel from "@/components/layout/RunHistoryPanel";
import AIGenerateModal from "@/components/layout/AIGenerateModal";
import { Toaster, toast } from "@/components/ui/toast";
import { useWorkflowRunner } from "@/lib/useWorkflowRunner";
import { SAMPLE_NODES, SAMPLE_EDGES } from "@/lib/sampleWorkflow";

type Props = {
  workflow: { id: string; name: string; nodes: AppNode[]; edges: AppEdge[]; workflowRuns: WorkflowRunRecord[] };
  allWorkflows: { id: string; name: string; updatedAt: string | Date }[];
};

/** What actually gets persisted — transient UI/run-progress state is stripped. */
function persistable(name: string, nodes: AppNode[], edges: AppEdge[]) {
  return JSON.stringify({
    name,
    nodes: nodes.map(n => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { isRunning, fileData, previewUrl, ...data } = n.data;
      return { id: n.id, type: n.type, position: n.position, data: { ...data, ...(typeof previewUrl === "string" && !previewUrl.startsWith("blob:") ? { previewUrl } : {}) } };
    }),
    edges: edges.map(({ id, source, sourceHandle, target, targetHandle, style }) => ({ id, source, sourceHandle, target, targetHandle, style })),
  });
}

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

export default function WorkflowEditor({ workflow, allWorkflows }: Props) {
  const { run, progress } = useWorkflowRunner();
  // The store is seeded in an effect; until then it holds nothing (or the previous workflow),
  // so render nothing rather than flashing an empty canvas or the wrong graph.
  const ready = useWorkflowStore(s => s.workflowId === workflow.id);
  const [picker, setPicker] = useState<{ open: boolean; pos: { x: number; y: number } | null }>({ open: false, pos: null });
  const [showHistory, setShowHistory] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const lastSaved = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  // Seed the store once per navigation (and again if the store was reset, e.g. by hot reload).
  useEffect(() => {
    if (ready) return;
    const s = useWorkflowStore.getState();
    s.loadWorkflow({ id: workflow.id, name: workflow.name, nodes: workflow.nodes, edges: workflow.edges });
    s.setRunHistory(workflow.workflowRuns);
    const after = useWorkflowStore.getState();
    lastSaved.current = persistable(after.workflowName, after.nodes, after.edges);
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow.id, ready]);

  const save = useCallback(async (opts?: { keepalive?: boolean }) => {
    const s = useWorkflowStore.getState();
    if (!s.workflowId || !loaded.current) return;
    const body = persistable(s.workflowName, s.nodes, s.edges);
    if (body === lastSaved.current) return;
    s.setSaveState("saving");
    try {
      const res = await fetch(`/api/workflow/${s.workflowId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body, keepalive: opts?.keepalive && body.length < 60_000 });
      if (!res.ok) {
        const msg = res.status === 413 ? "This workflow is too large to save." : `Save failed (${res.status})`;
        throw new Error(msg);
      }
      lastSaved.current = body;
      useWorkflowStore.getState().setSaveState("saved");
    } catch (err) {
      console.error("[WorkflowEditor] Autosave failed:", err);
      useWorkflowStore.getState().setSaveState("error");
    }
  }, []);

  // Debounced autosave on any persistable change.
  useEffect(() => {
    return useWorkflowStore.subscribe((s, prev) => {
      if (s.nodes === prev.nodes && s.edges === prev.edges && s.workflowName === prev.workflowName) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(), 1200);
    });
  }, [save]);

  // Flush pending edits when the tab is hidden or closed.
  useEffect(() => {
    const flush = () => { if (document.visibilityState === "hidden") save({ keepalive: true }); };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      const s = useWorkflowStore.getState();
      if (persistable(s.workflowName, s.nodes, s.edges) !== lastSaved.current) { save({ keepalive: true }); e.preventDefault(); }
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("beforeunload", beforeUnload);
    return () => { document.removeEventListener("visibilitychange", flush); window.removeEventListener("beforeunload", beforeUnload); if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [save]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const s = useWorkflowStore.getState();
      // A dialog/picker owns the keyboard while open (⌘Enter in "AI Generate" must not also start a run).
      if (e.defaultPrevented || document.querySelector(".modal-backdrop, .picker")) return;
      if (mod && e.key === "Enter") { e.preventDefault(); run("full"); return; }
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); save(); toast.info("Saved."); return; }
      if (isTypingTarget(e.target)) return;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) s.redo(); else s.undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); s.redo(); }
      else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const sel = s.nodes.filter(n => n.selected);
        sel.forEach(n => s.duplicateNode(n.id));
      }
      else if (!mod && !e.altKey && (e.key === "n" || e.key === "N")) { e.preventDefault(); setPicker({ open: true, pos: null }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, save]);

  const loadTemplate = useCallback(() => {
    const s = useWorkflowStore.getState();
    s.saveSnapshot();
    s.setGraph(JSON.parse(JSON.stringify(SAMPLE_NODES)), JSON.parse(JSON.stringify(SAMPLE_EDGES)));
    if (s.workflowName === "New Workflow" || s.workflowName === "Untitled Workflow") s.setWorkflowName("Product Marketing Kit");
    window.dispatchEvent(new Event("canvas-fit-view"));
    toast.success("Template loaded — press Run to try it.");
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".react-flow__node, .react-flow__edge, .canvas-toolbar, .react-flow__minimap")) return;
    e.preventDefault();
    setPicker({ open: true, pos: { x: e.clientX, y: e.clientY } });
  }, []);

  if (!ready) return <div className="editor-shell" aria-busy="true" />;

  return (
    <ReactFlowProvider>
      <div className="editor-shell">
        <TopBar
          allWorkflows={allWorkflows}
          progress={progress}
          onRun={run}
          onHistoryOpen={() => setShowHistory(true)}
          onGenerateOpen={() => setShowGenerate(true)}
          onSaveNow={() => save()}
        />
        <div style={{ flex: 1, position: "relative", minHeight: 0 }} onContextMenu={onContextMenu}>
          <WorkflowCanvas
            onAddNode={pos => setPicker({ open: true, pos: pos ?? null })}
            onGenerate={() => setShowGenerate(true)}
            onLoadTemplate={loadTemplate}
          />
        </div>
      </div>

      <NodePicker open={picker.open} position={picker.pos} onClose={() => setPicker({ open: false, pos: null })} />
      <RunHistoryPanel open={showHistory} onClose={() => setShowHistory(false)} />
      <AIGenerateModal open={showGenerate} onClose={() => setShowGenerate(false)} />
      <Toaster />
    </ReactFlowProvider>
  );
}
