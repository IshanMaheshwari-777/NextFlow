"use client";
import { Plus, Hand, Trash2, MousePointer2 } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";

type Props = { onAddNode: () => void };

export default function FloatingToolbar({ onAddNode }: Props) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 bg-[var(--layer-1)]/88 backdrop-blur-xl border border-white/[0.06] rounded-2xl px-1.5 py-1 shadow-lg">
      <ToolButton icon={<Plus className="w-4 h-4" />} label="Add Node" shortcut="N" onClick={onAddNode} accent />
      <div className="w-px h-5 bg-white/[0.06] mx-0.5" />
      <ToolButton icon={<MousePointer2 className="w-3.5 h-3.5" />} label="Select" active />
      <ToolButton icon={<Hand className="w-3.5 h-3.5" />} label="Pan" />
    </div>
  );
}

function ToolButton({ icon, label, shortcut, onClick, accent, active }: {
  icon: React.ReactNode; label: string; shortcut?: string; onClick?: () => void; accent?: boolean; active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-120
        ${accent ? "text-[var(--accent)] hover:bg-[var(--accent)]/10" : active ? "text-[var(--text-primary)] bg-white/[0.04]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.03]"}`}
    >
      {icon}
    </button>
  );
}
