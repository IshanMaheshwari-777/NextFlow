"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReactFlow, Background, BackgroundVariant, MiniMap, useReactFlow, useViewport, useNodesInitialized, type Connection, type Edge, type IsValidConnection, type OnConnectEnd } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore, explainConnection } from "@/store/workflowStore";
import { useShallow } from "zustand/react/shallow";
import { NodeType, AppNode, AppEdge, NODE_COLORS } from "@nextflow/shared/types";
import { Plus, MousePointer2, Hand, Play, Trash2, Copy, ZoomIn, ZoomOut, Maximize, Keyboard, Sparkles, LayoutTemplate } from "lucide-react";
import TextNode from "@/components/nodes/TextNode";
import UploadImageNode from "@/components/nodes/UploadImageNode";
import UploadVideoNode from "@/components/nodes/UploadVideoNode";
import LLMNode from "@/components/nodes/LLMNode";
import CropImageNode from "@/components/nodes/CropImageNode";
import ExtractFrameNode from "@/components/nodes/ExtractFrameNode";
import GenerateImageNode from "@/components/nodes/GenerateImageNode";
import PromptEnhancerNode from "@/components/nodes/PromptEnhancerNode";
import VideoEnhanceNode from "@/components/nodes/VideoEnhanceNode";
import DeletableEdge from "./DeletableEdge";
import { Modal } from "@/components/ui/Modal";
import { NODE_DRAG_MIME } from "@/components/layout/NodePalette";
import { useAddNode } from "@/lib/useAddNode";
import { toast } from "@/components/ui/toast";

const nodeTypes = { text: TextNode, "upload-image": UploadImageNode, "upload-video": UploadVideoNode, llm: LLMNode, "crop-image": CropImageNode, "extract-frame": ExtractFrameNode, "generate-image": GenerateImageNode, "prompt-enhancer": PromptEnhancerNode, "video-enhance": VideoEnhanceNode };
const edgeTypes = { deletable: DeletableEdge };

export const SHORTCUTS: [string, string][] = [
  ["N", "Add a node"],
  ["⌘ Enter", "Run workflow"],
  ["⌘ Z / ⌘ ⇧ Z", "Undo / redo"],
  ["⌘ D", "Duplicate selected node"],
  ["⌘ S", "Save now"],
  ["⌫ / Delete", "Delete selection"],
  ["Shift + drag", "Box-select nodes"],
  ["Space + drag", "Pan the canvas"],
  ["Double-click name", "Rename a node"],
];

type CanvasMode = "select" | "pan";
type Props = { onAddNode: (pos?: { x: number; y: number }) => void; onGenerate: () => void; onLoadTemplate: () => void };

export default function WorkflowCanvas({ onAddNode, onGenerate, onLoadTemplate }: Props) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, deleteNode, duplicateNode, isRunning } = useWorkflowStore(
    useShallow(s => ({ nodes: s.nodes, edges: s.edges, onNodesChange: s.onNodesChange, onEdgesChange: s.onEdgesChange, onConnect: s.onConnect, deleteNode: s.deleteNode, duplicateNode: s.duplicateNode, isRunning: s.isRunning }))
  );
  const rf = useReactFlow<AppNode, AppEdge>();
  const { zoom } = useViewport();
  const workflowId = useWorkflowStore(s => s.workflowId);
  const nodesInitialized = useNodesInitialized();
  const fittedFor = useRef<string | null>(null);

  // The `fitView` prop only fires on first render, but nodes are loaded into the store after
  // mount — so fit once per workflow as soon as React Flow has measured them.
  useEffect(() => {
    if (!workflowId || !nodesInitialized || fittedFor.current === workflowId || nodes.length === 0) return;
    fittedFor.current = workflowId;
    rf.fitView({ padding: 0.2, maxZoom: 1 });
  }, [workflowId, nodesInitialized, nodes.length, rf]);
  const [ctxMenu, setCtxMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("select");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = () => setCtxMenu(null);
    const fit = () => setTimeout(() => rf.fitView({ padding: 0.2, duration: 400, maxZoom: 1 }), 50);
    const shortcuts = () => setShowShortcuts(true);
    // Select a node and glide the camera to it (used when a run is blocked by that node).
    const focusNode = (e: Event) => {
      const id = (e as CustomEvent).detail?.nodeId as string;
      const n = rf.getNode(id);
      if (!n) return;
      useWorkflowStore.getState().onNodesChange(rf.getNodes().map(x => ({ type: "select" as const, id: x.id, selected: x.id === id })));
      const m = (n as { measured?: { width?: number; height?: number } }).measured;
      const w = m?.width ?? 288, h = m?.height ?? 200;
      rf.setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom: Math.max(rf.getZoom(), 0.8), duration: 400 });
    };
    window.addEventListener("canvas-focus-node", focusNode);
    window.addEventListener("click", close);
    window.addEventListener("canvas-fit-view", fit);
    window.addEventListener("open-shortcuts", shortcuts);
    return () => { window.removeEventListener("click", close); window.removeEventListener("canvas-fit-view", fit); window.removeEventListener("open-shortcuts", shortcuts); window.removeEventListener("canvas-focus-node", focusNode); };
  }, [rf]);

  // Wires animate only while data is actually flowing into a running node.
  const renderedEdges = useMemo(() => {
    const running = new Set(nodes.filter(n => n.data.isRunning).map(n => n.id));
    return edges.map(e => ({ ...e, type: "deletable", animated: running.has(e.target) }));
  }, [edges, nodes]);

  // Live feedback while dragging a wire: incompatible handles turn red and refuse the drop.
  const isValidConnection = useCallback<IsValidConnection<Edge>>((c) => explainConnection(nodes, edges, c) === null, [nodes, edges]);

  // A refused drop would otherwise just silently snap back — say why.
  const onConnectEnd = useCallback<OnConnectEnd>((_, state) => {
    if (state.isValid !== false || !state.fromHandle || !state.toHandle) return;
    const from = state.fromHandle, to = state.toHandle;
    const c = from.type === "source"
      ? { source: from.nodeId, sourceHandle: from.id ?? null, target: to.nodeId, targetHandle: to.id ?? null }
      : { source: to.nodeId, sourceHandle: to.id ?? null, target: from.nodeId, targetHandle: from.id ?? null };
    const reason = explainConnection(nodes, edges, c);
    if (reason) toast.warning(reason);
  }, [nodes, edges]);

  const handleConnect = useCallback((c: Connection) => {
    const reason = onConnect(c);
    if (reason) toast.warning(reason);
  }, [onConnect]);

  // Drop target for the node library: the node lands exactly where it's released.
  const addAt = useAddNode();
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(NODE_DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    const type = e.dataTransfer.getData(NODE_DRAG_MIME) as NodeType;
    if (!type) return;
    e.preventDefault();
    addAt(type, { x: e.clientX, y: e.clientY }, true);
  }, [addAt]);

  const onPaneDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".react-flow__node, .react-flow__edge, button, input, textarea")) return;
    onAddNode({ x: e.clientX, y: e.clientY });
  }, [onAddNode]);

  const ctxNode = ctxMenu ? nodes.find(n => n.id === ctxMenu.id) : null;

  return (
    <div ref={wrapperRef} className="canvas-wrap" onDoubleClick={onPaneDoubleClick} onDragOver={onDragOver} onDrop={onDrop}>
      {nodes.length === 0 && (
        <div className="canvas-empty">
          <h2>Start building your workflow</h2>
          <p>Chain AI models, images and video into a pipeline you can run with one click.</p>
          <div className="canvas-empty-actions">
            <button className="empty-card" onClick={() => onAddNode()}>
              <span className="empty-card-icon"><Plus size={16} /></span>
              <span className="empty-card-title">Add a node</span>
              <span className="empty-card-sub">Press <kbd>N</kbd> or double-click the canvas</span>
            </button>
            <button className="empty-card" onClick={onGenerate}>
              <span className="empty-card-icon"><Sparkles size={16} /></span>
              <span className="empty-card-title">Describe it to AI</span>
              <span className="empty-card-sub">“Enhance my prompt, then generate an image”</span>
            </button>
            <button className="empty-card" onClick={onLoadTemplate}>
              <span className="empty-card-icon"><LayoutTemplate size={16} /></span>
              <span className="empty-card-title">Use a template</span>
              <span className="empty-card-sub">Product marketing kit — image, video &amp; copy</span>
            </button>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes} edges={renderedEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        onConnectEnd={onConnectEnd}
        onNodeContextMenu={(e, node) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ id: node.id, top: e.clientY, left: e.clientX }); }}
        deleteKeyCode={["Delete", "Backspace"]}
        fitView fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        minZoom={0.15} maxZoom={2}
        zoomOnDoubleClick={false}
        panOnDrag={canvasMode === "pan" ? true : [1]}
        panActivationKeyCode="Space"
        selectionOnDrag={canvasMode === "select"}
        selectionKeyCode="Shift"
        panOnScroll
        proOptions={{ hideAttribution: true }}
        connectionLineStyle={{ stroke: "var(--text-muted)", strokeWidth: 2, strokeDasharray: "5 4" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="var(--dot-color)" />
        <MiniMap position="bottom-right" pannable zoomable maskColor="var(--minimap-mask)" nodeColor={n => NODE_COLORS[n.type as NodeType] || "#71717a"} nodeBorderRadius={6} />
      </ReactFlow>

      {/* Bottom toolbar */}
      <div className="canvas-toolbar" onDoubleClick={e => e.stopPropagation()}>
        <button className="toolbar-btn toolbar-btn-primary" onClick={() => onAddNode()} title="Add node (N)" aria-label="Add node"><Plus size={16} /></button>
        <div className="toolbar-sep" />
        <button className={`toolbar-btn ${canvasMode === "select" ? "is-active" : ""}`} onClick={() => setCanvasMode("select")} title="Select — drag to box-select" aria-pressed={canvasMode === "select"}><MousePointer2 size={15} /></button>
        <button className={`toolbar-btn ${canvasMode === "pan" ? "is-active" : ""}`} onClick={() => setCanvasMode("pan")} title="Pan — drag to move the canvas (or hold Space)" aria-pressed={canvasMode === "pan"}><Hand size={15} /></button>
        <div className="toolbar-sep" />
        <button className="toolbar-btn" onClick={() => rf.zoomOut({ duration: 150 })} title="Zoom out" aria-label="Zoom out"><ZoomOut size={15} /></button>
        <button className="toolbar-zoom" onClick={() => rf.zoomTo(1, { duration: 150 })} title="Reset to 100%">{Math.round(zoom * 100)}%</button>
        <button className="toolbar-btn" onClick={() => rf.zoomIn({ duration: 150 })} title="Zoom in" aria-label="Zoom in"><ZoomIn size={15} /></button>
        <button className="toolbar-btn" onClick={() => rf.fitView({ padding: 0.2, duration: 300, maxZoom: 1 })} title="Fit to screen" aria-label="Fit to screen"><Maximize size={14} /></button>
        <div className="toolbar-sep" />
        <button className="toolbar-btn" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts" aria-label="Keyboard shortcuts"><Keyboard size={15} /></button>
      </div>

      {/* Node context menu */}
      {ctxMenu && ctxNode && (
        <div className="menu" style={{ position: "fixed", top: Math.min(ctxMenu.top, window.innerHeight - 140), left: Math.min(ctxMenu.left, window.innerWidth - 190), zIndex: 1000 }} onClick={e => e.stopPropagation()} role="menu">
          <button role="menuitem" className="menu-item" disabled={isRunning} onClick={() => { window.dispatchEvent(new CustomEvent("run-single-node", { detail: { nodeId: ctxMenu.id } })); setCtxMenu(null); }}><Play size={13} /> Run this node</button>
          <button role="menuitem" className="menu-item" onClick={() => { duplicateNode(ctxMenu.id); setCtxMenu(null); }}><Copy size={13} /> Duplicate <kbd className="menu-kbd">⌘D</kbd></button>
          <div className="menu-sep" />
          <button role="menuitem" className="menu-item menu-item-danger" onClick={() => { deleteNode(ctxMenu.id); setCtxMenu(null); }}><Trash2 size={13} /> Delete <kbd className="menu-kbd">⌫</kbd></button>
        </div>
      )}

      <Modal open={showShortcuts} onClose={() => setShowShortcuts(false)} title="Keyboard shortcuts" width={420}>
        <div className="modal-body">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="shortcut-row"><span>{desc}</span><kbd>{key}</kbd></div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
