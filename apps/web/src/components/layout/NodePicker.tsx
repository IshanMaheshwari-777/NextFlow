"use client";
import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react";
import { SIDEBAR_NODES, NodeType, NODE_HANDLES } from "@nextflow/shared/types";
import { useWorkflowStore } from "@/store/workflowStore";
import { useReactFlow } from "@xyflow/react";
import { Search, CornerDownLeft } from "lucide-react";
import * as Icons from "lucide-react";

const CATEGORIES: { label: string; types: NodeType[] }[] = [
  { label: "Inputs", types: ["text", "upload-image", "upload-video"] },
  { label: "AI", types: ["llm", "prompt-enhancer", "generate-image"] },
  { label: "Image & video", types: ["crop-image", "extract-frame", "video-enhance"] },
];
const iconMap = Icons as unknown as Record<string, ComponentType<{ size?: number; style?: CSSProperties }>>;

type Props = { open: boolean; onClose: () => void; position?: { x: number; y: number } | null };

export default function NodePicker({ open, onClose, position }: Props) {
  const addNode = useWorkflowStore(s => s.addNode);
  const { screenToFlowPosition, flowToScreenPosition, setCenter, getZoom } = useReactFlow();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset the search box each time the picker reopens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) { setSearch(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);

  const q = search.trim().toLowerCase();
  const groups = useMemo(() => CATEGORIES.map(c => ({
    label: c.label,
    items: SIDEBAR_NODES.filter(n => c.types.includes(n.type) && (!q || n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q) || n.type.includes(q))),
  })).filter(g => g.items.length > 0), [q]);
  const flat = groups.flatMap(g => g.items);

  if (!open) return null;

  const handleAdd = (type: NodeType) => {
    const at = position ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    // Offset so the node's header lands under the cursor rather than its top-left corner.
    const p = screenToFlowPosition({ x: at.x - 140, y: at.y - 24 });
    // Find the nearest free spot (using React Flow's measured node sizes) so the new node
    // never lands on top of an existing one.
    const W = 288, H = 300, GAP = 24;
    const rects = useWorkflowStore.getState().nodes.map(n => {
      const m = (n as { measured?: { width?: number; height?: number } }).measured;
      return { x: n.position.x, y: n.position.y, w: m?.width ?? W, h: m?.height ?? H };
    });
    const free = (x: number, y: number) => rects.every(r => x + W + GAP <= r.x || r.x + r.w + GAP <= x || y + H + GAP <= r.y || r.y + r.h + GAP <= y);
    let spot = { x: p.x, y: p.y };
    search: for (let ring = 0; ring < 12; ring++) {
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const cand = { x: p.x + dx * ring * 80, y: p.y + dy * ring * 80 };
        if (free(cand.x, cand.y)) { spot = cand; break search; }
      }
    }
    const { x, y } = spot;
    addNode(type, { x, y });
    // If the free spot is off-screen, glide the camera over so the user sees what they added.
    const tl = flowToScreenPosition({ x, y }), br = flowToScreenPosition({ x: x + W, y: y + H });
    if (tl.x < 0 || tl.y < 52 || br.x > window.innerWidth || br.y > window.innerHeight - 70) {
      setCenter(x + W / 2, y + H / 2, { zoom: getZoom(), duration: 300 });
    }
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(flat.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === "Enter" && flat[active]) { e.preventDefault(); handleAdd(flat[active].type); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  const w = Math.min(420, window.innerWidth - 16);
  const h = 460;
  const left = position ? Math.min(Math.max(8, position.x - 24), window.innerWidth - w - 8) : (window.innerWidth - w) / 2;
  const top = position ? Math.min(Math.max(8, position.y), window.innerHeight - h - 8) : Math.max(64, window.innerHeight / 2 - h / 2);
  let idx = -1;

  return (
    <div ref={panelRef} className="picker" style={{ left, top, width: w }} role="dialog" aria-label="Add a node" onKeyDown={onKeyDown}>
      <div className="picker-search">
        <Search size={15} />
        <input ref={inputRef} type="text" placeholder="Search nodes…" value={search} onChange={e => { setSearch(e.target.value); setActive(0); }}
          aria-activedescendant={flat[active] ? `pick-${flat[active].type}` : undefined} aria-controls="picker-list" />
        <kbd>Esc</kbd>
      </div>
      <div className="picker-list" id="picker-list" role="listbox">
        {flat.length === 0 && <p className="picker-empty">No nodes match “{search}”</p>}
        {groups.map(g => (
          <div key={g.label}>
            <p className="menu-heading">{g.label}</p>
            {g.items.map(node => {
              idx++;
              const i = idx;
              const Icon = iconMap[node.icon];
              const io = NODE_HANDLES[node.type];
              const ins = io.inputs.map(x => x.type).filter((v, j, a) => a.indexOf(v) === j);
              return (
                <button key={node.type} id={`pick-${node.type}`} role="option" aria-selected={i === active} type="button"
                  className={`picker-item ${i === active ? "is-active" : ""}`} onMouseEnter={() => setActive(i)} onClick={() => handleAdd(node.type)}>
                  <span className="picker-icon" style={{ color: node.color, background: `${node.color}1a`, borderColor: `${node.color}33` }}>{Icon && <Icon size={15} />}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="picker-title">{node.label}</span>
                    <span className="picker-desc">{node.description}</span>
                  </span>
                  <span className="picker-io">{ins.length ? ins.join(" + ") : "source"} → {io.outputs[0]?.type}</span>
                  {i === active && <CornerDownLeft size={12} className="picker-enter" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="picker-footer"><span>↑↓ to navigate · ↵ to add</span><span>Tip: double-click the canvas</span></div>
    </div>
  );
}
