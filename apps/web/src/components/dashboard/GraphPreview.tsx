import { NODE_COLORS, NodeType } from "@nextflow/shared/types";

export type PreviewGraph = { nodes: { t: string; x: number; y: number }[]; edges: [number, number][] };

const NODE_W = 288, NODE_H = 170;

/** A to-scale mini map of the real workflow — the card shows *this* graph, not a generic icon. */
export default function GraphPreview({ graph }: { graph: PreviewGraph }) {
  if (graph.nodes.length === 0) {
    return <span className="wf-empty-preview">Empty canvas — open to add nodes</span>;
  }
  const minX = Math.min(...graph.nodes.map(n => n.x)), minY = Math.min(...graph.nodes.map(n => n.y));
  const maxX = Math.max(...graph.nodes.map(n => n.x)) + NODE_W, maxY = Math.max(...graph.nodes.map(n => n.y)) + NODE_H;
  const pad = 60;
  const vb = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
  return (
    <svg className="wf-graph" viewBox={vb} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {graph.edges.map(([a, b], i) => {
        const s = graph.nodes[a], t = graph.nodes[b];
        const x1 = s.x + NODE_W, y1 = s.y + 40, x2 = t.x, y2 = t.y + 40;
        const mid = (x1 + x2) / 2;
        return <path key={i} d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`} className="wf-graph-edge" />;
      })}
      {graph.nodes.map((n, i) => {
        const c = NODE_COLORS[n.t as NodeType] ?? "#71717a";
        return (
          <g key={i}>
            <rect x={n.x} y={n.y} width={NODE_W} height={NODE_H} rx={22} fill={c} fillOpacity={0.14} stroke={c} strokeOpacity={0.55} strokeWidth={5} />
            <rect x={n.x} y={n.y} width={NODE_W} height={44} rx={22} fill={c} fillOpacity={0.28} />
          </g>
        );
      })}
    </svg>
  );
}
