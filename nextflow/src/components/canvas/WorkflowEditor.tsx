"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflowStore";
import { AppNode, AppEdge, WorkflowRunRecord } from "@/types";
import WorkflowCanvas from "./WorkflowCanvas";
import TopBar from "@/components/layout/TopBar";
import NodePicker from "@/components/layout/NodePicker";
import RunHistoryPanel from "@/components/layout/RunHistoryPanel";

type Props = {
  workflow: { id: string; name: string; nodes: AppNode[]; edges: AppEdge[]; workflowRuns: WorkflowRunRecord[] };
  allWorkflows: { id: string; name: string; updatedAt: Date }[];
};

export default function WorkflowEditor({ workflow, allWorkflows }: Props) {
  const { loadWorkflow, setRunHistory, nodes, edges, workflowName, workflowId, undo, redo } = useWorkflowStore();
  const saveRef = useRef<NodeJS.Timeout | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadWorkflow({ id: workflow.id, name: workflow.name, nodes: workflow.nodes, edges: workflow.edges });
    setRunHistory(workflow.workflowRuns);
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
    try { await fetch(`/api/workflow/${workflowId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: workflowName, nodes, edges }) }); } catch {}
  }, [workflowId, workflowName, nodes, edges]);

  useEffect(() => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(save, 3000);
    return () => { if (saveRef.current) clearTimeout(saveRef.current); };
  }, [nodes, edges, workflowName]);

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
    </ReactFlowProvider>
  );
}
