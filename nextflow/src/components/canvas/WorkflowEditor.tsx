"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflowStore";
import { AppNode, AppEdge, WorkflowRunRecord } from "@/types";
import WorkflowCanvas from "./WorkflowCanvas";
import TopBar from "@/components/layout/TopBar";
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import NodePicker from "@/components/layout/NodePicker";

type Props = {
  workflow: { id: string; name: string; nodes: AppNode[]; edges: AppEdge[]; workflowRuns: WorkflowRunRecord[] };
  allWorkflows: { id: string; name: string; updatedAt: Date }[];
};

export default function WorkflowEditor({ workflow, allWorkflows }: Props) {
  const { loadWorkflow, setRunHistory, nodes, edges, workflowName, workflowId, undo, redo } = useWorkflowStore();
  const saveRef = useRef<NodeJS.Timeout | null>(null);
  // Context-menu node picker (right-click only)
  const [showCtxPicker, setShowCtxPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    loadWorkflow({ id: workflow.id, name: workflow.name, nodes: workflow.nodes, edges: workflow.edges });
    setRunHistory(workflow.workflowRuns);
  }, [workflow.id]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
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
    saveRef.current = setTimeout(save, 2000);
    return () => { if (saveRef.current) clearTimeout(saveRef.current); };
  }, [nodes, edges, workflowName]);

  // Right-click to open context node picker at cursor
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setPickerPos({ x: e.clientX, y: e.clientY });
    setShowCtxPicker(true);
  }, []);

  return (
    <ReactFlowProvider>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden", background: "#0a0a0f" }}>
        <TopBar allWorkflows={allWorkflows} />
        <div style={{ display: "flex", flex: 1, minHeight: 0 }} onContextMenu={handleContextMenu}>
          <LeftSidebar />
          <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
            <WorkflowCanvas />
          </div>
          <RightSidebar />
        </div>
        <NodePicker
          open={showCtxPicker}
          onClose={() => { setShowCtxPicker(false); setPickerPos(null); }}
          position={pickerPos}
        />
      </div>
    </ReactFlowProvider>
  );
}
