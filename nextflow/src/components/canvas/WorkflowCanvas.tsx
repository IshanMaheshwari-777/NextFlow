"use client";
import { useCallback, useRef, useState, useEffect } from "react";
import { ReactFlow, Background, BackgroundVariant, MiniMap, type Connection, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore } from "@/store/workflowStore";
import { NodeType, AppNode, AppEdge } from "@/types";
import { Plus, MousePointer2, Hand, Play, Trash2, Undo2, Keyboard } from "lucide-react";
import TextNode from "@/components/nodes/TextNode";
import UploadImageNode from "@/components/nodes/UploadImageNode";
import UploadVideoNode from "@/components/nodes/UploadVideoNode";
import LLMNode from "@/components/nodes/LLMNode";
import CropImageNode from "@/components/nodes/CropImageNode";
import ExtractFrameNode from "@/components/nodes/ExtractFrameNode";
import GenerateImageNode from "@/components/nodes/GenerateImageNode";
import PromptEnhancerNode from "@/components/nodes/PromptEnhancerNode";

const nodeTypes = { text: TextNode, "upload-image": UploadImageNode, "upload-video": UploadVideoNode, llm: LLMNode, "crop-image": CropImageNode, "extract-frame": ExtractFrameNode, "generate-image": GenerateImageNode, "prompt-enhancer": PromptEnhancerNode };
const defaultEdgeOptions = { type: "smoothstep", animated: true, style: { stroke: "rgba(139,92,246,0.3)", strokeWidth: 2 } };

type CanvasMode = "select" | "pan";

type Props = { onAddNode: () => void };

export default function WorkflowCanvas({ onAddNode }: Props) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, deleteNode, undo, redo, past, future } = useWorkflowStore();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfRef = useRef<ReactFlowInstance<AppNode, AppEdge> | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("select");
    const [showShortcuts, setShowShortcuts] = useState(false);

  
  useEffect(() => {
    const h = () => setCtxMenu(null);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setCtxMenu(null); };
    window.addEventListener("click", h);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("click", h); window.removeEventListener("keydown", esc); };
  }, []);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: AppNode) => {
    event.preventDefault();
    setCtxMenu({ id: node.id, top: event.clientY, left: event.clientX });
  }, []);

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

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".react-flow__node")) return;
    onAddNode();
  }, [onAddNode]);

  const dotColor = "var(--text-dim)";

  return (
    <div ref={wrapperRef} style={{ width: "100%", height: "100%", position: "relative", background: "var(--canvas-bg)" }} onDragOver={onDragOver} onDrop={onDrop} onDoubleClick={onDoubleClick}>
      {/* Empty state */}
      {nodes.length === 0 && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 1, textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 400, color: "var(--text-muted)", margin: "0 0 6px" }}>Add a node</p>
          <p style={{ fontSize: 13, color: "var(--border)", margin: 0 }}>Double click, right click, or press N</p>
        </div>
      )}

      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={(c: Connection) => onConnect(c)}
        onNodeContextMenu={onNodeContextMenu}
        onInit={i => { rfRef.current = i; }}
        deleteKeyCode={["Delete", "Backspace"]}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        fitView fitViewOptions={{ padding: 0.3, maxZoom: 0.8 }}
        minZoom={0.1} maxZoom={3}
        defaultEdgeOptions={defaultEdgeOptions}
        panOnDrag={canvasMode === "pan"}
        selectionOnDrag={canvasMode === "select"}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={dotColor} />
        <MiniMap
          position="bottom-right"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, bottom: 20, right: 20 }}
          maskColor="rgba(139,92,246,0.06)"
          nodeColor={n => ({ text: "#6366f1", "upload-image": "#34D399", "upload-video": "#FBBF24", llm: "#8b5cf6", "crop-image": "#ef4444", "extract-frame": "#ec4899", "generate-image": "#f43f5e", "prompt-enhancer": "#3b82f6" } as any)[n.type || ""] || "var(--text-muted)"}
        />
      </ReactFlow>

      {/* Bottom center pill toolbar */}
      <div style={{
        position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 2,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 999, padding: "4px 6px",
        backdropFilter: "blur(12px)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        zIndex: 10,
      }}>
        {[
          { icon: <Plus size={16} />, label: "Add Node (N)", action: onAddNode, accent: true },
          { icon: <MousePointer2 size={15} />, label: "Select mode", action: () => setCanvasMode("select"), active: canvasMode === "select" },
          { icon: <Hand size={15} />, label: "Pan mode", action: () => setCanvasMode("pan"), active: canvasMode === "pan" },
        ].map((btn, i) => (
          <button key={i} onClick={btn.action} title={btn.label} style={{
            width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            background: btn.active ? "var(--border)" : btn.accent ? "rgba(139,92,246,0.12)" : "transparent",
            border: "none", cursor: "pointer",
            color: btn.active ? "var(--text)" : btn.accent ? "#a78bfa" : "var(--text-muted)",
            transition: "all 100ms",
          }}
            onMouseEnter={e => { if (!btn.active) e.currentTarget.style.background = "var(--nav-hover)"; }}
            onMouseLeave={e => { if (!btn.active && !btn.accent) e.currentTarget.style.background = "transparent"; if (!btn.active && btn.accent) e.currentTarget.style.background = "var(--nav-hover)"; }}
          >
            {btn.icon}
          </button>
        ))}
      </div>

      {/* Bottom left: undo/redo + shortcuts */}
      <div style={{ position: "absolute", bottom: 20, left: 20, display: "flex", alignItems: "center", gap: 4, zIndex: 10 }}>
        <button onClick={undo} disabled={past.length === 0} className="ghost-btn" title="Undo" style={{ width: 28, height: 28 }}><Undo2 size={14} /></button>
        <button onClick={redo} disabled={future.length === 0} className="ghost-btn" title="Redo" style={{ width: 28, height: 28 }}><Undo2 size={14} style={{ transform: "scaleX(-1)" }} /></button>
        <button onClick={() => setShowShortcuts(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-muted)", padding: "4px 8px", transition: "color 100ms" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >Keyboard shortcuts</button>
      </div>

      {/* Node context menu */}
      {ctxMenu && (
        <div style={{ position: "fixed", top: ctxMenu.top, left: ctxMenu.left, zIndex: 9999, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", padding: 4, minWidth: 150 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => { window.dispatchEvent(new CustomEvent("run-single-node", { detail: { nodeId: ctxMenu.id } })); setCtxMenu(null); }} style={{ width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, background: "transparent", color: "var(--text)", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Play style={{ width: 14, height: 14 }} /> Run this node
          </button>
          <button onClick={() => { deleteNode(ctxMenu.id); setCtxMenu(null); }} style={{ width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, background: "transparent", color: "#f87171", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Trash2 style={{ width: 14, height: 14 }} /> Delete node
          </button>
        </div>
      )}

      {/* Shortcuts modal */}
      {showShortcuts && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setShowShortcuts(false)}>
          <div style={{ width: 380, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Keyboard Shortcuts</h3>
            {[["N", "Open node picker"],["⌘ Enter", "Run full workflow"],["⌘ Z", "Undo"],["⌘ ⇧ Z", "Redo"],["Delete / ⌫", "Delete selected node"],["Esc", "Close panels"]].map(([key, desc]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{desc}</span>
                <kbd style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "monospace" }}>{key}</kbd>
              </div>
            ))}
            <button onClick={() => setShowShortcuts(false)} style={{ marginTop: 16, width: "100%", padding: 10, borderRadius: 8, background: "transparent", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, cursor: "pointer" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
