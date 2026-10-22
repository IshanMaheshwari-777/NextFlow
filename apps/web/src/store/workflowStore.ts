import { create } from "zustand";
import { addEdge, applyNodeChanges, applyEdgeChanges, type Connection, type NodeChange, type EdgeChange } from "@xyflow/react";
import { AppNode, AppEdge, NodeType, WorkflowRunRecord, HANDLE_COMPAT, NODE_HANDLES, HANDLE_COLORS } from "@nextflow/shared/types";
import { v4 as uuid } from "uuid";
import { wouldCreateCycle, downstreamNodeIds } from "@nextflow/shared/graph";
import { defaultNodeData } from "@/lib/nodeRegistry";

export type SaveState = "idle" | "saving" | "saved" | "error";

type Snapshot = { nodes: AppNode[]; edges: AppEdge[] };

type State = {
  workflowId: string | null; workflowName: string;
  nodes: AppNode[]; edges: AppEdge[];
  isRunning: boolean; currentRunId: string | null;
  runHistory: WorkflowRunRecord[]; selectedRunId: string | null;
  saveState: SaveState; lastSavedAt: number | null;
  cooldownEnd: number;
  past: Snapshot[];
  future: Snapshot[];
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  setWorkflowId: (id: string) => void;
  setWorkflowName: (name: string) => void;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
  setGraph: (nodes: AppNode[], edges: AppEdge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  /** Returns a human-readable reason when the connection is rejected, or null on success. */
  onConnect: (connection: Connection) => string | null;
  addNode: (type: NodeType, position?: { x: number; y: number }) => string;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data/output shape is genuinely heterogeneous across node types
  updateNodeData: (nodeId: string, data: Record<string, any>) => void;
  setNodeResult: (nodeId: string, status: "success" | "failed", output?: unknown, error?: string) => void;
  /** Clears run state. Pass ids to reset only those nodes (single/selected runs keep the rest). */
  resetNodeStates: (ids?: string[]) => void;
  loadWorkflow: (data: { id: string; name: string; nodes: AppNode[]; edges: AppEdge[] }) => void;
  exportAsJSON: () => string;
  /** Returns the number of imported nodes, or throws with a readable message. */
  importFromJSON: (json: string) => number;
  setRunHistory: (runs: WorkflowRunRecord[]) => void;
  setSelectedRunId: (id: string | null) => void;
  setIsRunning: (v: boolean) => void;
  setCurrentRunId: (id: string | null) => void;
  setSaveState: (s: SaveState) => void;
  startCooldown: (durationSeconds: number) => void;
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/**
 * `connectedInputs` is derived data (which input handles have a wire attached). Keeping it
 * on node.data lets node components disable a field without subscribing to all edges, but
 * it must be recomputed from the edges every time they change — otherwise deleting a wire
 * leaves the input greyed out forever.
 */
function syncConnectedInputs(nodes: AppNode[], edges: AppEdge[]): AppNode[] {
  const byTarget = new Map<string, string[]>();
  for (const e of edges) {
    const list = byTarget.get(e.target) ?? [];
    if (!list.includes(e.targetHandle)) list.push(e.targetHandle);
    byTarget.set(e.target, list);
  }
  return nodes.map(n => {
    const next = byTarget.get(n.id) ?? [];
    const prev: string[] = n.data.connectedInputs ?? [];
    if (prev.length === next.length && prev.every(h => next.includes(h))) return n;
    return { ...n, data: { ...n.data, connectedInputs: next } };
  });
}

/** Why `c` can't be connected, in plain words — or null when it's fine. Shared by drag feedback and onConnect. */
export function explainConnection(nodes: AppNode[], edges: AppEdge[], c: { source: string | null; target: string | null; sourceHandle?: string | null; targetHandle?: string | null }): string | null {
  const sourceNode = nodes.find(n => n.id === c.source);
  const targetNode = nodes.find(n => n.id === c.target);
  if (!sourceNode || !targetNode) return "That node no longer exists.";
  if (sourceNode.id === targetNode.id) return "A node can't feed into itself.";
  const srcHandle = NODE_HANDLES[sourceNode.type as NodeType]?.outputs.find(h => h.id === c.sourceHandle);
  const tgtHandle = NODE_HANDLES[targetNode.type as NodeType]?.inputs.find(h => h.id === c.targetHandle);
  if (!srcHandle || !tgtHandle) return "Connect an output (right side) to an input (left side).";
  if (!HANDLE_COMPAT[srcHandle.type]?.includes(tgtHandle.type)) {
    const want = tgtHandle.type === "image" ? "an image" : tgtHandle.type === "video" ? "a video" : "text";
    return `“${tgtHandle.label}” needs ${want}, but “${srcHandle.label}” is ${srcHandle.type === "image" ? "an image" : srcHandle.type === "video" ? "a video" : "text"}.`;
  }
  if (wouldCreateCycle(edges, c.source!, c.target!)) return "That connection would create a loop.";
  return null;
}

/** Transient UI state must never survive a reload (a run that was mid-flight is gone). */
function sanitizeLoadedNodes(nodes: AppNode[]): AppNode[] {
  return nodes.map(n => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isRunning, previewUrl, ...rest } = n.data ?? {};
    const keepPreview = typeof previewUrl === "string" && !previewUrl.startsWith("blob:");
    return {
      ...n,
      selected: false,
      data: {
        ...rest,
        ...(keepPreview ? { previewUrl } : {}),
        runStatus: rest.runStatus === "running" ? "idle" : rest.runStatus ?? "idle",
      },
    };
  });
}

function readCooldown(): number {
  if (typeof window === "undefined") return 0;
  try { return Number(localStorage.getItem("global-image-generation-cooldown") || 0); } catch { return 0; }
}

export const useWorkflowStore = create<State>()((set, get) => ({
  workflowId: null, workflowName: "Untitled Workflow",
  nodes: [], edges: [],
  isRunning: false, currentRunId: null,
  runHistory: [], selectedRunId: null,
  saveState: "idle", lastSavedAt: null,
  past: [], future: [],

  saveSnapshot: () => {
    const { nodes, edges, past } = get();
    set({ past: [...past.slice(-49), { nodes: clone(nodes), edges: clone(edges) }], future: [] });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [{ nodes: clone(nodes), edges: clone(edges) }, ...future],
      nodes: syncConnectedInputs(previous.nodes, previous.edges),
      edges: previous.edges,
    });
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      past: [...past, { nodes: clone(nodes), edges: clone(edges) }],
      future: future.slice(1),
      nodes: syncConnectedInputs(next.nodes, next.edges),
      edges: next.edges,
    });
  },

  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name.trim() || "Untitled Workflow" }),
  setNodes: (nodes) => set(state => ({ nodes: syncConnectedInputs(nodes, state.edges) })),
  setEdges: (edges) => set(state => ({ edges, nodes: syncConnectedInputs(state.nodes, edges) })),
  setGraph: (nodes, edges) => set({ nodes: syncConnectedInputs(nodes, edges), edges }),

  onNodesChange: (changes) => {
    const shouldSnapshot = changes.some(c => c.type === "remove" || c.type === "add" || (c.type === "position" && c.dragging === false));
    if (shouldSnapshot) get().saveSnapshot();
    set(state => ({ nodes: applyNodeChanges(changes, state.nodes) as AppNode[] }));
  },
  onEdgesChange: (changes) => {
    const shouldSnapshot = changes.some(c => c.type === "remove" || c.type === "add");
    if (shouldSnapshot) get().saveSnapshot();
    set(state => {
      const edges = applyEdgeChanges(changes, state.edges) as AppEdge[];
      const touched = changes.some(c => c.type === "remove" || c.type === "add" || c.type === "replace");
      return { edges, nodes: touched ? syncConnectedInputs(state.nodes, edges) : state.nodes };
    });
  },

  onConnect: (connection) => {
    const { nodes, edges } = get();
    const problem = explainConnection(nodes, edges, connection);
    if (problem) return problem;
    const srcHandle = NODE_HANDLES[nodes.find(n => n.id === connection.source)!.type as NodeType].outputs.find(h => h.id === connection.sourceHandle)!;
    const tgtHandle = NODE_HANDLES[nodes.find(n => n.id === connection.target)!.type as NodeType].inputs.find(h => h.id === connection.targetHandle)!;
    const newEdge: AppEdge = {
      id: `e-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
      source: connection.source!, sourceHandle: connection.sourceHandle!,
      target: connection.target!, targetHandle: connection.targetHandle!,
      animated: true, style: { stroke: HANDLE_COLORS[srcHandle.type] || HANDLE_COLORS.any, strokeWidth: 2 },
    };
    get().saveSnapshot();
    set(state => {
      // A single-value input takes one wire; reconnecting replaces the old one. "images" collects many.
      const kept = tgtHandle.id === "images" ? state.edges : state.edges.filter(e => !(e.target === newEdge.target && e.targetHandle === newEdge.targetHandle));
      const edges = addEdge(newEdge, kept) as AppEdge[];
      return { edges, nodes: syncConnectedInputs(state.nodes, edges) };
    });
    return null;
  },

  addNode: (type, position) => {
    get().saveSnapshot();
    const id = `${type}-${uuid().slice(0, 8)}`;
    const node: AppNode = { id, type, position: position || { x: 200 + Math.random() * 200, y: 100 + Math.random() * 150 }, data: { ...defaultNodeData(type), runStatus: "idle", connectedInputs: [] } };
    set(state => ({ nodes: [...state.nodes.map(n => (n.selected ? { ...n, selected: false } : n)), { ...node, selected: true }] }));
    return id;
  },

  deleteNode: (id) => {
    get().saveSnapshot();
    set(state => {
      const edges = state.edges.filter(e => e.source !== id && e.target !== id);
      return { edges, nodes: syncConnectedInputs(state.nodes.filter(n => n.id !== id), edges) };
    });
  },

  duplicateNode: (id) => {
    const src = get().nodes.find(n => n.id === id);
    if (!src) return;
    get().saveSnapshot();
    const copyId = `${src.type}-${uuid().slice(0, 8)}`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { runOutput, runError, result, isRunning, connectedInputs, ...data } = src.data;
    const copy: AppNode = { id: copyId, type: src.type, position: { x: src.position.x + 40, y: src.position.y + 40 }, data: { ...data, label: `${src.data.label || "Node"} copy`, runStatus: "idle", connectedInputs: [] } };
    set(state => ({ nodes: [...state.nodes.map(n => (n.selected ? { ...n, selected: false } : n)), { ...copy, selected: true }] }));
  },

  updateNodeData: (nodeId, data) => set(state => {
    // Editing a node's inputs makes everything downstream of it stale — but status-only
    // updates coming from a run (isRunning/runStatus) mustn't wipe sibling results.
    const isRunUpdate = Object.keys(data).every(k => ["isRunning", "runStatus", "runError", "runOutput"].includes(k));
    const stale = isRunUpdate ? new Set<string>() : downstreamNodeIds(state.edges, nodeId);
    return {
      nodes: state.nodes.map(n => {
        if (n.id === nodeId) return { ...n, data: { ...n.data, ...data } };
        if (stale.has(n.id) && n.data.runOutput !== undefined) {
          return { ...n, data: { ...n.data, runStatus: "idle", runOutput: undefined, runError: undefined, result: undefined } };
        }
        return n;
      }),
    };
  }),

  setNodeResult: (nodeId, status, output, error) => set(state => {
    const llmText = output && typeof output === "object" && "text" in output && typeof output.text === "string" ? output.text : undefined;
    return {
      nodes: state.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isRunning: false, runStatus: status, runOutput: output, runError: error, ...(n.type === "llm" ? { result: llmText } : {}) } } : n)
    };
  }),

  resetNodeStates: (ids) => set(state => {
    const only = ids ? new Set(ids) : null;
    return {
      nodes: state.nodes.map(n => (only && !only.has(n.id)) ? n : ({ ...n, data: { ...n.data, isRunning: false, runStatus: "idle", runOutput: undefined, runError: undefined, result: undefined } })),
    };
  }),

  loadWorkflow: ({ id, name, nodes, edges }) => set({
    workflowId: id, workflowName: name,
    nodes: syncConnectedInputs(sanitizeLoadedNodes(nodes), edges), edges,
    past: [], future: [], selectedRunId: null, saveState: "idle", lastSavedAt: null, isRunning: false,
  }),

  exportAsJSON: () => {
    const { workflowName, nodes, edges } = get();
    return JSON.stringify({ name: workflowName, nodes: nodes.map(n => ({ ...n, selected: undefined })), edges }, null, 2);
  },

  importFromJSON: (json) => {
    let p: { name?: unknown; nodes?: unknown; edges?: unknown };
    try { p = JSON.parse(json); } catch { throw new Error("That file isn't valid JSON."); }
    // Imported file content is unvalidated JSON — shape isn't known until these checks run.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const validTypes = new Set(Object.keys(NODE_HANDLES));
    const nodes: AppNode[] = Array.isArray(p.nodes)
      ? p.nodes.filter((n: any) => n && typeof n.id === "string" && validTypes.has(n.type)).map((n: any) => ({ ...n, position: n.position ?? { x: 0, y: 0 }, data: n.data ?? {} }))
      : [];
    if (nodes.length === 0) throw new Error("No NextFlow nodes found in that file.");
    const nodeIds = new Set(nodes.map(n => n.id));
    const rawEdges: AppEdge[] = Array.isArray(p.edges) ? p.edges.filter((e: any) => e && nodeIds.has(e.source) && nodeIds.has(e.target)) : [];
    /* eslint-enable @typescript-eslint/no-explicit-any */
    // Accept edges one at a time, same rule as manual drag-connect, so an imported file can never smuggle in a cycle.
    const edges: AppEdge[] = [];
    for (const e of rawEdges) {
      if (wouldCreateCycle(edges, e.source, e.target)) continue;
      edges.push(e);
    }
    get().saveSnapshot();
    // Keep the current workflow's id: the imported file's id likely doesn't exist in this DB.
    set({
      workflowName: typeof p.name === "string" && p.name.trim() ? p.name : get().workflowName,
      nodes: syncConnectedInputs(sanitizeLoadedNodes(nodes), edges),
      edges,
    });
    return nodes.length;
  },

  setRunHistory: (runs) => set({ runHistory: runs }),
  setSelectedRunId: (id) => set({ selectedRunId: id }),
  setIsRunning: (v) => set({ isRunning: v }),
  setCurrentRunId: (id) => set({ currentRunId: id }),
  setSaveState: (s) => set(s === "saved" ? { saveState: s, lastSavedAt: Date.now() } : { saveState: s }),
  cooldownEnd: readCooldown(),
  startCooldown: (durationSeconds) => {
    const end = Date.now() + durationSeconds * 1000;
    try { localStorage.setItem("global-image-generation-cooldown", end.toString()); } catch { /* storage blocked */ }
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
