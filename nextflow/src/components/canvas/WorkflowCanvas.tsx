"use client";
import { useCallback, useRef } from "react";
import { ReactFlow, Background, BackgroundVariant, MiniMap, Controls, type Connection, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore } from "@/store/workflowStore";
import { NodeType, AppNode, AppEdge } from "@/types";
import { Workflow, Keyboard } from "lucide-react";
import TextNode from "@/components/nodes/TextNode";
import UploadImageNode from "@/components/nodes/UploadImageNode";
import UploadVideoNode from "@/components/nodes/UploadVideoNode";
import LLMNode from "@/components/nodes/LLMNode";
import CropImageNode from "@/components/nodes/CropImageNode";
import ExtractFrameNode from "@/components/nodes/ExtractFrameNode";

const nodeTypes = { text: TextNode, "upload-image": UploadImageNode, "upload-video": UploadVideoNode, llm: LLMNode, "crop-image": CropImageNode, "extract-frame": ExtractFrameNode };

const defaultEdgeOptions = {
  type: "smoothstep",
  animated: true,
  style: { stroke: "rgba(124,92,255,0.3)", strokeWidth: 2 },
};

export default function WorkflowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useWorkflowStore();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfRef = useRef<ReactFlowInstance<AppNode, AppEdge> | null>(null);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/nodeType") as NodeType;
    if (!type || !rfRef.current) return;
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const position = rfRef.current.screenToFlowPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
    addNode(type, position);
  }, [addNode]);

  return (
    <div ref={wrapperRef} className="w-full h-full relative" onDragOver={onDragOver} onDrop={onDrop}>
      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none z-[1]">
          <div className="w-14 h-14 rounded-2xl bg-[#7C5CFF]/[0.06] border border-dashed border-[#7C5CFF]/20 flex items-center justify-center mb-4">
            <Workflow className="w-6 h-6 text-[#7C5CFF]/50" />
          </div>
          <p className="text-[15px] text-[#8B8FA3]/60 font-medium">Build your workflow</p>
          <div className="flex items-center gap-2 mt-2.5">
            <span className="text-[11px] text-[#4E5264]">Drag nodes from the left panel</span>
            <span className="text-[#4E5264] mx-1">·</span>
            <span className="text-[11px] text-[#4E5264]">right-click for menu</span>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={(c: Connection) => onConnect(c)}
        onInit={i => { rfRef.current = i; }}
        deleteKeyCode={["Delete", "Backspace"]}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        fitView fitViewOptions={{ padding: 0.3, maxZoom: 0.8 }}
        minZoom={0.1} maxZoom={3}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={{ hideAttribution: true }}
      >
  <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1a1a1a" />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap
          position="bottom-right"
          style={{ background: "#111217", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}
          maskColor="rgba(124,92,255,0.06)"
          nodeColor={n => ({ text: "#6366f1", "upload-image": "#34D399", "upload-video": "#FBBF24", llm: "#7C5CFF", "crop-image": "#ef4444", "extract-frame": "#ec4899" } as any)[n.type || ""] || "#4E5264"}
        />
      </ReactFlow>
    </div>
  );
}
