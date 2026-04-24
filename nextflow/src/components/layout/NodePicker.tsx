"use client";
import { useEffect, useRef, useState } from "react";
import { SIDEBAR_NODES, NodeType } from "@/types";
import { useWorkflowStore } from "@/store/workflowStore";
import { useReactFlow } from "@xyflow/react";
import { X, Search } from "lucide-react";
import * as Icons from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  position?: { x: number; y: number } | null;
};

export default function NodePicker({ open, onClose, position }: Props) {
  const { addNode } = useWorkflowStore();
  const { screenToFlowPosition } = useReactFlow();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setSearch(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleAdd = (type: NodeType) => {
    if (position) {
      addNode(type, screenToFlowPosition({ x: position.x, y: position.y }));
    } else {
      addNode(type, screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
    }
    onClose();
  };

  const filtered = search.trim()
    ? SIDEBAR_NODES.filter(n => n.label.toLowerCase().includes(search.toLowerCase()) || n.description.toLowerCase().includes(search.toLowerCase()))
    : SIDEBAR_NODES;

  if (!open) return null;

  const left = position ? Math.min(position.x, window.innerWidth - 280) : window.innerWidth / 2 - 130;
  const top = position ? Math.min(position.y, window.innerHeight - 420) : window.innerHeight / 2 - 200;

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed", left, top, zIndex: 100,
        width: 270, background: "rgba(14,14,20,0.97)", backdropFilter: "blur(20px)",
        border: "1px solid #1c1c28", borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.05)",
        overflow: "hidden",
        animation: "fadeIn 0.12s ease",
      }}
    >
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #1c1c28" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#0c0c12", borderRadius: 8, padding: "7px 10px",
          border: "1px solid #1c1c28",
        }}>
          <Search style={{ width: 14, height: 14, color: "#4a4a5e", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#e4e4ed", width: "100%" }}
            placeholder="Search nodes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && filtered.length > 0) handleAdd(filtered[0].type); }}
          />
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <X style={{ width: 14, height: 14, color: "#4a4a5e" }} />
          </button>
        </div>
      </div>

      <div style={{ maxHeight: 320, overflowY: "auto", padding: "4px 6px" }}>
        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", fontSize: 12, color: "#4a4a5e", padding: "24px 0" }}>No matching nodes</p>
        ) : (
          filtered.map(node => <PickerNodeItem key={node.type} node={node} onAdd={handleAdd} />)
        )}
      </div>

      <div style={{ padding: "8px 12px", borderTop: "1px solid #1c1c28", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "#2e2e3e" }}>↵ to add</span>
        <span style={{ fontSize: 10, color: "#2e2e3e" }}>ESC to close</span>
      </div>
    </div>
  );
}

function PickerNodeItem({ node, onAdd }: { node: (typeof SIDEBAR_NODES)[number]; onAdd: (t: NodeType) => void }) {
  const [hovered, setHovered] = useState(false);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const Icon = (Icons as any)[node.icon] as any;
  return (
    <button
      type="button"
      onClick={() => onAdd(node.type)}
      draggable
      onDragStart={e => { e.dataTransfer.setData("application/nodeType", node.type); e.dataTransfer.effectAllowed = "move"; }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", marginBottom: 1,
        background: hovered ? "#16161f" : "transparent",
        border: "none", borderRadius: 10, cursor: "grab",
        textAlign: "left", transition: "background 100ms ease",
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${node.color}12`, border: `1px solid ${node.color}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "transform 100ms ease",
        transform: hovered ? "scale(1.1)" : "scale(1)",
      }}>
        {Icon && <Icon style={{ width: 15, height: 15, color: node.color }} />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: hovered ? "#fff" : "#b4b4c8", transition: "color 100ms ease" }}>{node.label}</p>
        <p style={{ margin: "1px 0 0", fontSize: 11, color: "#4a4a5e" }}>{node.description}</p>
      </div>
    </button>
  );
}
