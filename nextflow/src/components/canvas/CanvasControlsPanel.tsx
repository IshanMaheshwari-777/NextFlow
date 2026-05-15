"use client";
import React from "react";
import { useReactFlow } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflowStore";
import { ZoomIn, ZoomOut, Maximize, Undo2, Redo2, Play } from "lucide-react";

export default function CanvasControlsPanel() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { past, future, undo, redo, nodes, isRunning } = useWorkflowStore();

  const selectedCount = nodes.filter(n => n.selected).length;

  const handleRunClick = () => {
    // Dispatch custom event handled by TopBar or direct window trigger
    // Wait, TopBar handles Enter key and run menus. Let's trigger a run via custom event or button
    const mode = selectedCount > 0 ? "selected" : "full";
    window.dispatchEvent(new CustomEvent("canvas-run-workflow", { detail: { mode } }));
  };

  // Add global listener in useEffect to forward to TopBar's run handler if needed,
  // or let's make sure TopBar listens to "canvas-run-workflow" event! Let's check if we can add a listener in TopBar.

  return (
    <div className="absolute bottom-6 left-6 z-[10] flex flex-col gap-2 pointer-events-none">
      {/* Primary Floating Run Button (FIX 12 & FIX 9) */}
      <button
        type="button"
        disabled={isRunning || nodes.length === 0}
        onClick={handleRunClick}
        className={`pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-xs shadow-lg transition-all ${isRunning
            ? "bg-violet-600/40 text-violet-200 cursor-not-allowed border border-violet-500/20"
            : nodes.length === 0
              ? "bg-zinc-800/60 text-zinc-600 cursor-not-allowed border border-zinc-700/30"
              : "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/25 hover:shadow-violet-500/40 border border-violet-400/30"
          }`}
        style={{
          boxShadow: isRunning ? "none" : "0 8px 20px rgba(124,92,255,0.3)",
        }}
      >
        <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? "animate-pulse" : ""}`} />
        <span>{isRunning ? "Running…" : selectedCount > 0 ? `Run Selected (${selectedCount})` : "Run Workflow"}</span>
      </button>

      {/* Stack of Canvas Layout Controls (FIX 4) */}
      <div className="pointer-events-auto flex flex-col gap-[2px] bg-[#12121a] border border-[var(--border)] rounded-xl p-1 shadow-xl w-9">
        <button
          type="button"
          onClick={() => zoomIn({ duration: 200 })}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8b8b9e] hover:text-[#e4e4ed] hover:bg-[#1a1a26] transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => zoomOut({ duration: 200 })}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8b8b9e] hover:text-[#e4e4ed] hover:bg-[#1a1a26] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => fitView({ padding: 0.2, duration: 300 })}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8b8b9e] hover:text-[#e4e4ed] hover:bg-[#1a1a26] transition-colors"
          title="Fit View"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>

        <div className="w-full h-[1px] bg-[var(--border)] my-1" />

        <button
          type="button"
          onClick={() => undo()}
          disabled={past.length === 0}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${past.length === 0
              ? "text-[#3a3a4e] cursor-not-allowed opacity-30"
              : "text-[#8b8b9e] hover:text-[#e4e4ed] hover:bg-[#1a1a26]"
            }`}
          title="Undo"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => redo()}
          disabled={future.length === 0}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${future.length === 0
              ? "text-[#3a3a4e] cursor-not-allowed opacity-30"
              : "text-[#8b8b9e] hover:text-[#e4e4ed] hover:bg-[#1a1a26]"
            }`}
          title="Redo"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
