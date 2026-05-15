"use client";
import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { Search, ChevronsLeft, ChevronsRight } from "lucide-react";
import * as Icons from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { SIDEBAR_NODES, NodeType } from "@/types";

export default function LeftSidebar() {
  const { addNode, isLeftOpen, setIsLeftOpen } = useWorkflowStore();
  const { getViewport } = useReactFlow();
  const [search, setSearch] = useState("");

  const handleClick = (type: NodeType) => {
    const { x, y, zoom } = getViewport();
    addNode(type, { x: (-x + window.innerWidth * 0.5) / zoom, y: (-y + window.innerHeight * 0.4) / zoom });
  };

  const filtered = search.trim()
    ? SIDEBAR_NODES.filter(n => n.label.toLowerCase().includes(search.toLowerCase()) || n.description.toLowerCase().includes(search.toLowerCase()))
    : SIDEBAR_NODES;

  const EXPANDED_W = 260;
  const COLLAPSED_W = 52;

  return (
    <div style={{
      flexShrink: 0, height: "100%", display: "flex", flexDirection: "column",
      background: "#0e0e14", borderRight: "1px solid #1c1c28",
      width: isLeftOpen ? EXPANDED_W : COLLAPSED_W,
      minWidth: isLeftOpen ? EXPANDED_W : COLLAPSED_W,
      transition: "width 220ms cubic-bezier(0.4,0,0.2,1), min-width 220ms cubic-bezier(0.4,0,0.2,1)",
      overflow: "hidden", position: "relative",
    }}>
      {/* ─── COLLAPSED: Icon rail ─── */}
      {!isLeftOpen && (
        <div style={{ width: COLLAPSED_W, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 4, height: "100%" }}>
          <button
            type="button" onClick={() => setIsLeftOpen(true)}
            style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", color: "#4a4a5e", marginBottom: 8 }}
            onMouseEnter={e => { e.currentTarget.style.background = "#16161f"; e.currentTarget.style.color = "#8b8b9e"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#4a4a5e"; }}
            title="Expand panel"
          >
            <ChevronsRight style={{ width: 16, height: 16 }} />
          </button>
          <div style={{ width: 24, height: 1, background: "#1c1c28", marginBottom: 4 }} />
          {SIDEBAR_NODES.map(node => <CollapsedNodeIcon key={node.type} node={node} onClick={handleClick} />)}
        </div>
      )}

      {/* ─── EXPANDED: Full sidebar ─── */}
      {isLeftOpen && (
        <>
          {/* Header */}
          <div style={{ padding: "16px 14px 10px", flexShrink: 0, minWidth: EXPANDED_W, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: "#4a4a5e", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>Nodes</h2>
            <button
              type="button" onClick={() => setIsLeftOpen(false)}
              style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", color: "#4a4a5e" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#16161f"; e.currentTarget.style.color = "#8b8b9e"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#4a4a5e"; }}
              title="Collapse panel"
            >
              <ChevronsLeft style={{ width: 14, height: 14 }} />
            </button>
          </div>
          {/* Search */}
          <div style={{ padding: "0 14px 10px", flexShrink: 0, minWidth: EXPANDED_W }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0c0c12", borderRadius: 10, padding: "8px 12px", border: "1px solid #1c1c28" }}>
              <Search style={{ width: 14, height: 14, color: "#4a4a5e", flexShrink: 0 }} />
              <input type="text" style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#8b8b9e", width: "100%" }} placeholder="Search nodes..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {/* Node list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "2px 6px", minWidth: EXPANDED_W }}>
            {filtered.length === 0 ? (
              <p style={{ textAlign: "center", fontSize: 12, color: "#4a4a5e", padding: "32px 0" }}>No matching nodes</p>
            ) : (
              filtered.map(node => <ExpandedNodeItem key={node.type} node={node} onClick={handleClick} />)
            )}
          </div>
          {/* Footer */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid #1c1c28", textAlign: "center", flexShrink: 0, minWidth: EXPANDED_W }}>
            <span style={{ fontSize: 9, color: "#2e2e3e", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Drag or click to add</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Collapsed icon button ─── */
function CollapsedNodeIcon({ node, onClick }: { node: (typeof SIDEBAR_NODES)[number]; onClick: (t: NodeType) => void }) {
  const [hovered, setHovered] = useState(false);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const Icon = (Icons as any)[node.icon] as any;
  return (
    <button
      type="button"
      onClick={() => onClick(node.type)}
      draggable
      onDragStart={e => { e.dataTransfer.setData("application/nodeType", node.type); e.dataTransfer.effectAllowed = "move"; }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={node.label}
      style={{
        width: 36, height: 36, borderRadius: 10,
        background: hovered ? `${node.color}18` : `${node.color}0a`,
        border: `1px solid ${hovered ? node.color + "30" : "transparent"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "grab", transition: "all 150ms ease",
        transform: hovered ? "scale(1.1)" : "scale(1)",
      }}
    >
      {Icon && <Icon style={{ width: 16, height: 16, color: node.color }} />}
    </button>
  );
}

/* ─── Expanded node card ─── */
function ExpandedNodeItem({ node, onClick }: { node: (typeof SIDEBAR_NODES)[number]; onClick: (t: NodeType) => void }) {
  const [hovered, setHovered] = useState(false);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const Icon = (Icons as any)[node.icon] as any;
  return (
    <button
      type="button"
      draggable
      onDragStart={e => { e.dataTransfer.setData("application/nodeType", node.type); e.dataTransfer.effectAllowed = "move"; }}
      onClick={() => onClick(node.type)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "10px 12px", marginBottom: 2,
        background: hovered ? "#16161f" : "transparent",
        border: `1px solid ${hovered ? "#1c1c28" : "transparent"}`,
        borderRadius: 12, cursor: "grab", textAlign: "left", transition: "all 150ms ease",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${node.color}12`, border: `1px solid ${node.color}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "transform 150ms ease",
        transform: hovered ? "scale(1.08)" : "scale(1)",
      }}>
        {Icon && <Icon style={{ width: 18, height: 18, color: node.color }} />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: hovered ? "#fff" : "#b4b4c8", transition: "color 150ms ease", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>{node.label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: hovered ? "#6a6a80" : "#4a4a5e", transition: "color 150ms ease", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>{node.description}</p>
      </div>
    </button>
  );
}
