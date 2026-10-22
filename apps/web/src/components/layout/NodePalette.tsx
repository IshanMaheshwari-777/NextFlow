"use client";
import { useEffect, useState, type ComponentType, type CSSProperties } from "react";
import { SIDEBAR_NODES, NodeType } from "@nextflow/shared/types";
import { PanelLeftClose, PanelLeftOpen, GripVertical } from "lucide-react";
import * as Icons from "lucide-react";

const GROUPS: { label: string; types: NodeType[] }[] = [
  { label: "Inputs", types: ["text", "upload-image", "upload-video"] },
  { label: "AI", types: ["llm", "prompt-enhancer", "generate-image"] },
  { label: "Image & video", types: ["crop-image", "extract-frame", "video-enhance"] },
];
const iconMap = Icons as unknown as Record<string, ComponentType<{ size?: number; style?: CSSProperties }>>;
export const NODE_DRAG_MIME = "application/x-nextflow-node";

/** Always-visible node library: drag a block onto the canvas, or click to drop it in view. */
export default function NodePalette({ onAdd }: { onAdd: (type: NodeType) => void }) {
  const [open, setOpen] = useState(true);
  // Remembered per browser; small screens start collapsed so the canvas gets the room.
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("nf-palette-open"); } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate a client-only preference
    setOpen(saved ? saved === "1" : window.innerWidth >= 900);
  }, []);
  const toggle = () => setOpen(o => { try { localStorage.setItem("nf-palette-open", o ? "0" : "1"); } catch { /* storage blocked */ } return !o; });

  if (!open) {
    return (
      <button className="palette-tab" onClick={toggle} title="Show node library" aria-label="Show node library">
        <PanelLeftOpen size={15} />
      </button>
    );
  }

  return (
    <aside className="palette" aria-label="Node library">
      <div className="palette-head">
        <span>Nodes</span>
        <button className="icon-btn icon-btn-sm" onClick={toggle} title="Hide node library" aria-label="Hide node library"><PanelLeftClose size={15} /></button>
      </div>
      <div className="palette-body">
        {GROUPS.map(g => (
          <div key={g.label} className="palette-group">
            <p className="menu-heading">{g.label}</p>
            {SIDEBAR_NODES.filter(n => g.types.includes(n.type)).map(n => {
              const Icon = iconMap[n.icon];
              return (
                <button
                  key={n.type}
                  className="palette-item"
                  draggable
                  onDragStart={e => { e.dataTransfer.setData(NODE_DRAG_MIME, n.type); e.dataTransfer.effectAllowed = "copy"; }}
                  onClick={() => { onAdd(n.type); if (window.innerWidth < 760) setOpen(false); }}
                  title={`${n.description} — drag onto the canvas or click to add`}
                >
                  <span className="palette-icon" style={{ color: n.color, background: `${n.color}1a`, borderColor: `${n.color}38` }}>{Icon && <Icon size={14} />}</span>
                  <span className="palette-label">{n.label}</span>
                  <GripVertical size={13} className="palette-grip" />
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="palette-hint">Drag onto the canvas, or press <kbd>N</kbd></p>
    </aside>
  );
}
