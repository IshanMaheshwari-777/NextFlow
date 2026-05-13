"use client";
import { memo, ReactNode, useEffect, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { NODE_HANDLES, NodeType, HandleType } from "@/types";
import { Loader2, CheckCircle2, XCircle, Trash2, AlertTriangle } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";

const HANDLE_COLORS: Record<HandleType, string> = { text: "#818cf8", image: "#34D399", video: "#FBBF24", any: "#8B8FA3" };

type Props = { id: string; type: NodeType; label: string; accentColor: string; icon: ReactNode; isRunning?: boolean; runStatus?: string; runError?: string; children: ReactNode; selected?: boolean };

export default memo(function BaseNode({ id, type, label, accentColor, icon, isRunning, runStatus, runError, children, selected }: Props) {
  const { deleteNode } = useWorkflowStore();
  const handles = NODE_HANDLES[type];
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => setTick((t) => t + 1), 500);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  return (
    <div
      className={cn(
        "relative min-w-[220px] max-w-[320px] transition-all duration-200",
        isRunning && "node-running",
        !isRunning && runStatus === "success" && "node-success",
        !isRunning && runStatus === "failed" && "node-failed"
      )}
      style={{
        borderRadius: 14,
        border: selected ? "1px solid rgba(139,92,246,0.4)" : "1px solid #1e1e2a",
        background: "#12121a",
        boxShadow: selected
          ? "0 0 0 2px rgba(139,92,246,0.12), 0 8px 32px rgba(0,0,0,0.5)"
          : "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      {/* Accent gradient line */}
      <div style={{
        height: 2, borderTopLeftRadius: 14, borderTopRightRadius: 14,
        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}40, transparent)`,
        opacity: 0.6,
      }} />

      {handles.inputs.map((h, i) => <Handle key={h.id} type="target" position={Position.Left} id={h.id} style={{ top: `${((i + 1) / (handles.inputs.length + 1)) * 100}%`, background: HANDLE_COLORS[h.type], borderColor: "#0a0a0f", borderWidth: 2, width: 10, height: 10, left: -5 }} title={`${h.label} (${h.type})`} />)}
      {handles.outputs.map((h, i) => <Handle key={h.id} type="source" position={Position.Right} id={h.id} style={{ top: `${((i + 1) / (handles.outputs.length + 1)) * 100}%`, background: HANDLE_COLORS[h.type], borderColor: "#0a0a0f", borderWidth: 2, width: 10, height: 10, right: -5 }} title={`${h.label} (${h.type})`} />)}

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderBottom: "1px solid #1e1e2a",
        background: `${accentColor}06`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 7,
            background: `${accentColor}15`, border: `1px solid ${accentColor}25`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ color: accentColor, display: "flex" }}>{icon}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#d4d4e0", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {isRunning && <Loader2 className="w-3.5 h-3.5 text-[#fbbf24] animate-spin" />}
          {!isRunning && runStatus === "success" && <CheckCircle2 style={{ width: 14, height: 14, color: "#34d399" }} />}
          {!isRunning && runStatus === "failed" && <XCircle style={{ width: 14, height: 14, color: "#f87171" }} />}
          <button
            type="button" onClick={() => deleteNode(id)}
            style={{
              width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 5, background: "transparent", border: "none", cursor: "pointer",
              color: "#3a3a4e", transition: "all 150ms ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.12)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#3a3a4e"; }}
          >
            <Trash2 style={{ width: 11, height: 11 }} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px", fontSize: 12 }}>
        {children}
        {/* Show error message on node body when runStatus is "failed" */}
        {!isRunning && runStatus === "failed" && runError && (
          <div style={{ marginTop: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "6px 10px", display: "flex", alignItems: "flex-start", gap: 6 }}>
            <AlertTriangle style={{ width: 12, height: 12, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 10, color: "#f87171", lineHeight: 1.5, wordBreak: "break-word" }}>{runError}</p>
          </div>
        )}
      </div>
    </div>
  );
});
