"use client";
import { memo, useState, type ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { NODE_HANDLES, NodeType, HANDLE_COLORS, NODE_COLORS } from "@nextflow/shared/types";
import { Loader2, CheckCircle2, XCircle, Trash2, Copy, Play, AlertTriangle } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";

type Props = {
  id: string;
  type: NodeType;
  label: string;
  icon: ReactNode;
  isRunning?: boolean;
  runStatus?: string;
  runError?: string;
  connectedInputs?: string[];
  children: ReactNode;
  selected?: boolean;
};

export default memo(function BaseNode({ id, type, label, icon, isRunning, runStatus, runError, connectedInputs = [], children, selected }: Props) {
  const { deleteNode, duplicateNode, updateNodeData } = useWorkflowStore.getState();
  const workflowBusy = useWorkflowStore(s => s.isRunning);
  const handles = NODE_HANDLES[type];
  const accent = NODE_COLORS[type];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  const status = isRunning ? "running" : runStatus === "success" ? "success" : runStatus === "failed" ? "failed" : "idle";
  const commitName = () => { setEditing(false); const v = draft.trim(); if (v && v !== label) updateNodeData(id, { label: v }); else setDraft(label); };

  return (
    <div className={`flow-node ${selected ? "is-selected" : ""} status-${status}`} style={{ ["--node-accent" as string]: accent }}>
      {/* Header */}
      <div className="flow-node-header">
        <div className="flow-node-icon">{icon}</div>
        {editing ? (
          <input
            autoFocus
            onFocus={e => e.currentTarget.select()}
            className="flow-node-title-input nodrag"
            value={draft}
            maxLength={60}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setDraft(label); setEditing(false); } e.stopPropagation(); }}
          />
        ) : (
          <span className="flow-node-title" title="Double-click to rename" onDoubleClick={e => { e.stopPropagation(); setDraft(label); setEditing(true); }}>{label}</span>
        )}
        <div className="flow-node-status" aria-live="polite">
          {status === "running" && <Loader2 size={14} className="animate-spin" style={{ color: "var(--warning)" }} aria-label="Running" />}
          {status === "success" && <CheckCircle2 size={14} style={{ color: "var(--success)" }} aria-label="Succeeded" />}
          {status === "failed" && <XCircle size={14} style={{ color: "var(--error)" }} aria-label="Failed" />}
        </div>
        <div className="flow-node-actions nodrag">
          <button type="button" className="icon-btn icon-btn-xs" title="Run this node" aria-label={`Run ${label}`} disabled={workflowBusy}
            onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("run-single-node", { detail: { nodeId: id } })); }}>
            <Play size={11} fill="currentColor" />
          </button>
          <button type="button" className="icon-btn icon-btn-xs" title="Duplicate" aria-label={`Duplicate ${label}`} onClick={e => { e.stopPropagation(); duplicateNode(id); }}>
            <Copy size={11} />
          </button>
          <button type="button" className="icon-btn icon-btn-xs icon-btn-danger" title="Delete" aria-label={`Delete ${label}`} onClick={e => { e.stopPropagation(); deleteNode(id); }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Ports — every handle sits next to a readable label so users know what plugs in where. */}
      {(handles.inputs.length > 0 || handles.outputs.length > 0) && (
        <div className="flow-node-ports">
          <div className="ports-col">
            {handles.inputs.map(h => {
              const linked = connectedInputs.includes(h.id);
              return (
                <div key={h.id} className="port port-in" title={`${h.label} — accepts ${h.type}${h.id === "images" ? " (multiple)" : ""}`}>
                  <Handle type="target" position={Position.Left} id={h.id} className="port-handle" style={{ background: linked ? HANDLE_COLORS[h.type] : "var(--node-bg)", borderColor: HANDLE_COLORS[h.type] }} />
                  <span className="port-dot" style={{ background: HANDLE_COLORS[h.type] }} />
                  <span className={linked ? "port-label is-linked" : "port-label"}>{h.label}{h.required && <span className="port-req">*</span>}</span>
                </div>
              );
            })}
          </div>
          <div className="ports-col ports-col-out">
            {handles.outputs.map(h => (
              <div key={h.id} className="port port-out" title={`${h.label} — outputs ${h.type}`}>
                <span className="port-label">{h.label}</span>
                <span className="port-dot" style={{ background: HANDLE_COLORS[h.type] }} />
                <Handle type="source" position={Position.Right} id={h.id} className="port-handle" style={{ background: HANDLE_COLORS[h.type], borderColor: HANDLE_COLORS[h.type] }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flow-node-body">
        {children}
        {status === "failed" && runError && (
          <div className="node-error" role="alert">
            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            <p>{runError}</p>
          </div>
        )}
      </div>
    </div>
  );
});
