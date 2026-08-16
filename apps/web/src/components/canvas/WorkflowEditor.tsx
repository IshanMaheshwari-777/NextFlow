"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useShallow } from "zustand/react/shallow";
import { AppNode, AppEdge, WorkflowRunRecord } from "@nextflow/shared/types";
import WorkflowCanvas from "./WorkflowCanvas";
import TopBar from "@/components/layout/TopBar";
import NodePicker from "@/components/layout/NodePicker";
import RunHistoryPanel from "@/components/layout/RunHistoryPanel";

type Props = {
  workflow: { id: string; name: string; nodes: AppNode[]; edges: AppEdge[]; workflowRuns: WorkflowRunRecord[] };
  allWorkflows: { id: string; name: string; updatedAt: Date }[];
};

export default function WorkflowEditor({ workflow, allWorkflows }: Props) {
  const { loadWorkflow, setRunHistory, nodes, edges, workflowName, workflowId, undo, redo } = useWorkflowStore(
    useShallow(s => ({ loadWorkflow: s.loadWorkflow, setRunHistory: s.setRunHistory, nodes: s.nodes, edges: s.edges, workflowName: s.workflowName, workflowId: s.workflowId, undo: s.undo, redo: s.redo }))
  );
  const saveRef = useRef<NodeJS.Timeout | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Intentionally keyed on workflow.id alone: this seeds the store once per navigation,
  // not on every re-render of these prop fields.
  useEffect(() => {
    loadWorkflow({ id: workflow.id, name: workflow.name, nodes: workflow.nodes, edges: workflow.edges });
    setRunHistory(workflow.workflowRuns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow.id]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        if (e.shiftKey) { e.preventDefault(); redo(); } else { e.preventDefault(); undo(); }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault(); redo();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setPickerPos(null);
        setShowPicker(true);
      } else if (e.key === "Escape") {
        setShowPicker(false);
        setShowHistory(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [undo, redo]);

  const save = useCallback(async () => {
    if (!workflowId) return;
    try {
      const res = await fetch(`/api/workflow/${workflowId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: workflowName, nodes, edges }) });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setSaveError(null);
    } catch (err) {
      console.error("[WorkflowEditor] Autosave failed:", err);
      setSaveError("Changes couldn't be saved — check your connection.");
    }
  }, [workflowId, workflowName, nodes, edges]);

  useEffect(() => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(save, 3000);
    return () => { if (saveRef.current) clearTimeout(saveRef.current); };
  }, [save]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".react-flow__node")) return;
    e.preventDefault();
    setPickerPos({ x: e.clientX, y: e.clientY });
    setShowPicker(true);
  }, []);

  return (
    <ReactFlowProvider>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--canvas-bg)" }}>
        <TopBar allWorkflows={allWorkflows} onHistoryOpen={() => setShowHistory(true)} />
        <div style={{ flex: 1, position: "relative", minHeight: 0 }} onContextMenu={handleContextMenu}>
          <WorkflowCanvas onAddNode={() => { setPickerPos(null); setShowPicker(true); }} />
        </div>
      </div>

      <NodePicker
        open={showPicker}
        onClose={() => { setShowPicker(false); setPickerPos(null); }}
        position={pickerPos}
      />

      <RunHistoryPanel open={showHistory} onClose={() => setShowHistory(false)} />

      {saveError && (
        <div
          role="status"
          style={{
            position: "fixed", bottom: 20, left: 20, zIndex: 9999,
            display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10,
            background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
            backdropFilter: "blur(12px)", fontSize: 12, color: "#f87171", fontWeight: 500,
          }}
        >
          {saveError}
        </div>
      )}
    </ReactFlowProvider>
  );
}
