"use client";
import { useEffect, useRef, useState } from "react";
import { SIDEBAR_NODES, NodeType } from "@/types";
import { useWorkflowStore } from "@/store/workflowStore";
import { useReactFlow } from "@xyflow/react";
import { Search } from "lucide-react";
import * as Icons from "lucide-react";

const CATEGORIES: { label: string; types: NodeType[] }[] = [
  { label: "Text", types: ["text"] },
  { label: "AI", types: ["llm", "generate-image", "prompt-enhancer"] },
  { label: "Image", types: ["upload-image", "crop-image"] },
  { label: "Video", types: ["upload-video", "extract-frame", "video-enhance"] },
];

type Props = { open: boolean; onClose: () => void; position?: { x: number; y: number } | null };

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
    const h = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const handleAdd = (type: NodeType) => {
    if (position) addNode(type, screenToFlowPosition({ x: position.x, y: position.y }));
    else addNode(type, screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
    onClose();
  };

  const query = search.trim().toLowerCase();
  const filtered = query ? SIDEBAR_NODES.filter(n => n.label.toLowerCase().includes(query) || n.description.toLowerCase().includes(query)) : null;

  if (!open) return null;

  // Center the 480px picker, or near cursor
  const w = 480;
  const left = position ? Math.min(position.x - w / 2, window.innerWidth - w - 16) : window.innerWidth / 2 - w / 2;
  const top = position ? Math.min(position.y, window.innerHeight - 420) : window.innerHeight / 2 - 220;

  return (
    <div ref={panelRef} style={{
      position: "fixed", left: Math.max(8, left), top: Math.max(8, top), zIndex: 1000, width: w,
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
      backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      overflow: "hidden", animation: "pickerIn 0.13s cubic-bezier(0.16,1,0.3,1)",
    }}>
      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
        <Search size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          style={{ background: "transparent", border: "none", outline: "none", fontSize: 14, color: "var(--text)", width: "100%", fontFamily: "inherit" }}
          placeholder="Search nodes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (filtered ? filtered : SIDEBAR_NODES).length > 0) handleAdd((filtered ? filtered : SIDEBAR_NODES)[0].type); }}
        />
        <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>ESC to close</span>
      </div>

      {/* List */}
      <div style={{ maxHeight: 340, overflowY: "auto", padding: "6px 8px" }}>
        {filtered !== null ? (
          filtered.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", padding: "32px 0", margin: 0 }}>No results</p>
          ) : (
            filtered.map(node => <PickerItem key={node.type} node={node} onAdd={handleAdd} />)
          )
        ) : (
          CATEGORIES.map(cat => {
            const items = SIDEBAR_NODES.filter(n => cat.types.includes(n.type));
            return (
              <div key={cat.label}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", padding: "8px 8px 4px", margin: 0 }}>{cat.label}</p>
                {items.map(node => <PickerItem key={node.type} node={node} onAdd={handleAdd} />)}
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "#333" }}>↵ to add first result</span>
        <span style={{ fontSize: 10, color: "#333" }}>Double-click canvas to open</span>
      </div>
    </div>
  );
}

function PickerItem({ node, onAdd }: { node: typeof SIDEBAR_NODES[number]; onAdd: (t: NodeType) => void }) {
  const [hovered, setHovered] = useState(false);
  const Icon = (Icons as any)[node.icon] as any;
  return (
    <button type="button" onClick={() => onAdd(node.type)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", background: hovered ? "var(--border-subtle)" : "transparent", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left", transition: "background 80ms" }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${node.color}15`, border: `1px solid ${node.color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {Icon && <Icon style={{ width: 15, height: 15, color: node.color }} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: hovered ? "var(--text)" : "var(--text-muted)", transition: "color 80ms" }}>{node.label}</p>
        <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--text-muted)" }}>{node.description}</p>
      </div>
    </button>
  );
}
