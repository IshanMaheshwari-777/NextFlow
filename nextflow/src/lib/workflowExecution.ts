// Node `data` is genuinely heterogeneous across the 9 node types (a text node's data
// looks nothing like a crop node's) — typed loosely by design rather than forcing a
// discriminated union through every call site that touches it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppNode = { id: string; type: string; position: { x: number; y: number }; data: Record<string, any> };
export type AppEdge = { id: string; source: string; sourceHandle: string; target: string; targetHandle: string };

/**
 * Groups nodes into execution layers via Kahn's algorithm. Nodes stuck in a cycle
 * never reach in-degree 0, so they're simply absent from the returned layers —
 * callers should cross-check against findCyclicNodeIds (src/lib/graph.ts) rather
 * than assume every input node appears in the output.
 */
export function topologicalSort(nodes: AppNode[], edges: AppEdge[]): AppNode[][] {
  const dependents = new Map<string, Set<string>>();
  const inCount = new Map<string, number>();
  for (const n of nodes) { dependents.set(n.id, new Set()); inCount.set(n.id, 0); }
  for (const e of edges) {
    if (dependents.has(e.source) && inCount.has(e.target)) {
      dependents.get(e.source)!.add(e.target);
      inCount.set(e.target, (inCount.get(e.target) || 0) + 1);
    }
  }
  const layers: AppNode[][] = [];
  let current = nodes.filter(n => inCount.get(n.id) === 0);
  while (current.length > 0) {
    layers.push(current);
    const next: AppNode[] = [];
    for (const node of current) {
      for (const depId of dependents.get(node.id) || []) {
        const cnt = (inCount.get(depId) || 0) - 1;
        inCount.set(depId, cnt);
        if (cnt === 0) { const dep = nodes.find(n => n.id === depId); if (dep) next.push(dep); }
      }
    }
    current = next;
  }
  return layers;
}

/** Extract a string URL from a value — only used for legacy edge cases */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts whatever shape an upstream node's output happens to be
export function extractStringUrl(val: any): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") {
    return val.imageUrl || val.videoUrl || val.url || val.output || val.text || "";
  }
  return "";
}

export type InputResolutionWarning = { nodeId: string; message: string };

/**
 * Merges a node's own data with whatever its connected upstream edges produced.
 * `onWarn` is called (instead of throwing) when an edge's value can't be resolved
 * to the shape its target handle expects — the node still runs with what it has.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- see AppNode.data note above */
export function resolveInputs(
  node: AppNode,
  edges: AppEdge[],
  outputs: Map<string, Record<string, any>>,
  onWarn?: (warning: InputResolutionWarning) => void
): Record<string, any> {
  const resolved: Record<string, any> = { ...node.data };
  for (const edge of edges.filter(e => e.target === node.id)) {
    const srcOut = outputs.get(edge.source);
    if (srcOut) {
      const raw = srcOut[edge.sourceHandle] ?? srcOut.output;
      if (raw !== undefined) {
        if (["imageUrl", "image_url", "video_url", "user_message", "system_prompt", "prompt"].includes(edge.targetHandle)) {
          const extracted = extractStringUrl(raw);
          if (extracted) {
            resolved[edge.targetHandle] = extracted;
          } else {
            onWarn?.({ nodeId: node.id, message: `Could not extract a string value for handle "${edge.targetHandle}"` });
          }
        } else if (edge.targetHandle === "images") {
          const url = extractStringUrl(raw);
          if (url) {
            resolved.images = [...(resolved.images || []), url];
          } else if (typeof raw === "string" && raw.startsWith("http")) {
            resolved.images = [...(resolved.images || []), raw];
          } else {
            onWarn?.({ nodeId: node.id, message: `Dropped an unresolved image input from node "${edge.source}"` });
          }
        } else {
          resolved[edge.targetHandle] = raw;
        }
      }
    }
  }
  return resolved;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
