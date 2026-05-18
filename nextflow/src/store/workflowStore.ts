import { create } from "zustand";
import { addEdge, applyNodeChanges, applyEdgeChanges, type Connection, type NodeChange, type EdgeChange } from "@xyflow/react";
import { AppNode, AppEdge, NodeType, WorkflowRunRecord, HANDLE_COMPAT, NODE_HANDLES } from "@/types";
import { v4 as uuid } from "uuid";

function defaultData(type: NodeType): Record<string, any> {
  switch (type) {
    case "text": return { label: "Text Node", text: "" };
    case "upload-image": return { label: "Upload Image" };
    case "upload-video": return { label: "Upload Video" };
    case "llm": return { label: "LLM Node", model: "llama-3.1-8b-instant", system_prompt: "", user_message: "" };
    case "crop-image": return { label: "Crop Image", x_percent: 0, y_percent: 0, width_percent: 100, height_percent: 100 };
    case "extract-frame": return { label: "Extract Frame", timestamp: 0 };
    case "generate-image": return { label: "Generate Image", prompt: "", model: "flux", width: 768, height: 768, seed: Math.floor(Math.random() * 1000000) };
    case "prompt-enhancer": return { label: "Enhance Prompt", prompt: "", style: "realistic" };
    case "video-enhance": return { label: "Video Enhance", video_url: "", resolution: "1080p", strength: "medium" };
    default: return { label: "Node" };
  }
}

type State = {
  workflowId: string | null; workflowName: string;
  nodes: AppNode[]; edges: AppEdge[];
  isRunning: boolean; currentRunId: string | null;
  runHistory: WorkflowRunRecord[]; selectedRunId: string | null;
  isLeftOpen: boolean; isRightOpen: boolean;
  cooldownEnd: number;
  past: Array<{ nodes: AppNode[]; edges: AppEdge[] }>;
  future: Array<{ nodes: AppNode[]; edges: AppEdge[] }>;
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  setWorkflowId: (id: string) => void;
  setWorkflowName: (name: string) => void;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => boolean;
  addNode: (type: NodeType, position?: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  updateNodeData: (nodeId: string, data: Record<string, any>) => void;
  setNodeResult: (nodeId: string, status: "success" | "failed", output?: any, error?: string) => void;
  resetNodeStates: () => void;
  loadWorkflow: (data: { id: string; name: string; nodes: AppNode[]; edges: AppEdge[] }) => void;
  exportAsJSON: () => string;
  importFromJSON: (json: string) => void;
  setRunHistory: (runs: WorkflowRunRecord[]) => void;
  addRunToHistory: (run: WorkflowRunRecord) => void;
  setSelectedRunId: (id: string | null) => void;
  setIsRunning: (v: boolean) => void;
  setCurrentRunId: (id: string | null) => void;
  setIsLeftOpen: (v: boolean) => void;
  setIsRightOpen: (v: boolean) => void;
  startCooldown: (durationSeconds: number) => void;
};

export const useWorkflowStore = create<State>()((set, get) => ({
  workflowId: null, workflowName: "Untitled Workflow",
  nodes: [], edges: [],
  isRunning: false, currentRunId: null,
  runHistory: [], selectedRunId: null,
  isLeftOpen: true, isRightOpen: true,
  past: [], future: [],

  saveSnapshot: () => {
    const { nodes, edges, past } = get();
    // Deep clone to prevent reference mutations
    const snapshot = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
    set({ past: [...past.slice(-49), snapshot], future: [] });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    set({
      past: newPast,
      future: [{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }, ...future],
      nodes: previous.nodes,
      edges: previous.edges,
    });
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    set({
      past: [...past, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }],
      future: newFuture,
      nodes: next.nodes,
      edges: next.edges,
    });
  },

  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  onNodesChange: (changes) => {
    const shouldSnapshot = changes.some(c => c.type === "remove" || c.type === "add" || (c.type === "position" && c.dragging === false));
    if (shouldSnapshot) get().saveSnapshot();
    set(state => ({ nodes: applyNodeChanges(changes, state.nodes) as AppNode[] }));
  },
  onEdgesChange: (changes) => {
    const shouldSnapshot = changes.some(c => c.type === "remove" || c.type === "add");
    if (shouldSnapshot) get().saveSnapshot();
    set(state => ({ edges: applyEdgeChanges(changes, state.edges) as AppEdge[] }));
  },

  onConnect: (connection) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    if (!sourceNode || !targetNode) return false;
    const srcHandle = NODE_HANDLES[sourceNode.type as NodeType]?.outputs.find(h => h.id === connection.sourceHandle);
    const tgtHandle = NODE_HANDLES[targetNode.type as NodeType]?.inputs.find(h => h.id === connection.targetHandle);
    if (!srcHandle || !tgtHandle) return false;
    if (!HANDLE_COMPAT[srcHandle.type]?.includes(tgtHandle.type)) return false;
    const visited = new Set<string>();
    const hasCycle = (cur: string, target: string): boolean => {
      if (cur === target) return true;
      if (visited.has(cur)) return false;
      visited.add(cur);
      return edges.filter(e => e.source === cur).some(e => hasCycle(e.target, target));
    };
    if (hasCycle(connection.target!, connection.source!)) return false;
    const colors: Record<string, string> = { text: "#6366f1", image: "#10b981", video: "#f59e0b", any: "#94a3b8" };
    const newEdge: AppEdge = {
      id: `e-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
      source: connection.source!, sourceHandle: connection.sourceHandle!,
      target: connection.target!, targetHandle: connection.targetHandle!,
      animated: true, style: { stroke: colors[srcHandle.type] || "#94a3b8", strokeWidth: 2 },
    };
    get().saveSnapshot();
    set(state => ({
      edges: addEdge(newEdge, state.edges) as AppEdge[],
      nodes: state.nodes.map(n => n.id === connection.target ? { ...n, data: { ...n.data, connectedInputs: [...(n.data.connectedInputs || []), connection.targetHandle!] } } : n),
    }));
    return true;
  },

  addNode: (type, position) => {
    get().saveSnapshot();
    const id = `${type}-${uuid().slice(0, 8)}`;
    const node: AppNode = { id, type, position: position || { x: 200 + Math.random() * 200, y: 100 + Math.random() * 150 }, data: { ...defaultData(type), runStatus: "idle", connectedInputs: [] } };
    set(state => ({ nodes: [...state.nodes, node] }));
  },

  deleteNode: (id) => {
    get().saveSnapshot();
    set(state => ({ nodes: state.nodes.filter(n => n.id !== id), edges: state.edges.filter(e => e.source !== id && e.target !== id) }));
  },

  updateNodeData: (nodeId, data) => set(state => ({ nodes: state.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n) })),

  setNodeResult: (nodeId, status, output, error) => set(state => ({
    nodes: state.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isRunning: false, runStatus: status, runOutput: output, runError: error, ...(n.type === "llm" && output?.text ? { result: output.text } : {}) } } : n)
  })),

  resetNodeStates: () => set(state => ({ nodes: state.nodes.map(n => ({ ...n, data: { ...n.data, isRunning: false, runStatus: "idle", runOutput: undefined, runError: undefined, result: undefined } })) })),

  loadWorkflow: ({ id, name, nodes, edges }) => set({ workflowId: id, workflowName: name, nodes, edges, past: [], future: [] }),
  exportAsJSON: () => { const { workflowId, workflowName, nodes, edges } = get(); return JSON.stringify({ id: workflowId, name: workflowName, nodes, edges }, null, 2); },
  importFromJSON: (json) => {
    try {
      const p = JSON.parse(json);
      // We do NOT import the ID from the JSON because it likely doesn't exist in the local DB.
      // This ensures we keep the current workspace's identity while importing its content.
      set({ 
        workflowName: p.name || get().workflowName || "Imported", 
        nodes: p.nodes || [], 
        edges: p.edges || [] 
      });
    } catch (e) {
      console.error("Failed to import workflow JSON:", e);
    }
  },
  setRunHistory: (runs) => set({ runHistory: runs }),
  addRunToHistory: (run) => set(state => ({ runHistory: [run, ...state.runHistory] })),
  setSelectedRunId: (id) => set({ selectedRunId: id }),
  setIsRunning: (v) => set({ isRunning: v }),
  setCurrentRunId: (id) => set({ currentRunId: id }),
  setIsLeftOpen: (v) => set({ isLeftOpen: v }),
  setIsRightOpen: (v) => set({ isRightOpen: v }),
  cooldownEnd: typeof window !== "undefined" ? Number(localStorage.getItem("global-image-generation-cooldown") || 0) : 0,
  startCooldown: (durationSeconds) => {
    const end = Date.now() + durationSeconds * 1000;
    if (typeof window !== "undefined") {
      localStorage.setItem("global-image-generation-cooldown", end.toString());
    }
    set({ cooldownEnd: end });
  },
}));

// Cross-tab synchronization for cooldown
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "global-image-generation-cooldown") {
      useWorkflowStore.setState({ cooldownEnd: Number(e.newValue || 0) });
    }
  });
}
