type GraphNode = { id: string };
type GraphEdge = { source: string; target: string };

/**
 * Would adding an edge source -> target create a cycle in the existing graph?
 * True iff target can already reach source by following existing edges.
 */
export function wouldCreateCycle<E extends GraphEdge>(edges: E[], source: string, target: string): boolean {
  if (source === target) return true;
  const visited = new Set<string>();
  const stack = [target];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (cur === source) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const e of edges) if (e.source === cur) stack.push(e.target);
  }
  return false;
}

/**
 * Returns the IDs of nodes that are part of at least one cycle (Kahn's algorithm —
 * any node that never reaches in-degree 0 is stuck in a cycle).
 */
export function findCyclicNodeIds<N extends GraphNode, E extends GraphEdge>(nodes: N[], edges: E[]): Set<string> {
  const inCount = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const n of nodes) { inCount.set(n.id, 0); dependents.set(n.id, []); }
  for (const e of edges) {
    if (!dependents.has(e.source) || !inCount.has(e.target)) continue;
    dependents.get(e.source)!.push(e.target);
    inCount.set(e.target, (inCount.get(e.target) || 0) + 1);
  }
  let frontier = nodes.filter(n => inCount.get(n.id) === 0).map(n => n.id);
  const visited = new Set<string>(frontier);
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const dep of dependents.get(id) || []) {
        const cnt = (inCount.get(dep) || 0) - 1;
        inCount.set(dep, cnt);
        if (cnt === 0 && !visited.has(dep)) { visited.add(dep); next.push(dep); }
      }
    }
    frontier = next;
  }
  return new Set(nodes.map(n => n.id).filter(id => !visited.has(id)));
}

/** BFS over outgoing edges — every node id reachable downstream of `startId` (excluding itself). */
export function downstreamNodeIds<E extends GraphEdge>(edges: E[], startId: string): Set<string> {
  const result = new Set<string>();
  const stack = [startId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const e of edges) {
      if (e.source === cur && !result.has(e.target)) {
        result.add(e.target);
        stack.push(e.target);
      }
    }
  }
  return result;
}
