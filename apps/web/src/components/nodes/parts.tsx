"use client";
import { useState, type ReactNode } from "react";
import { Link2, Maximize2, Download, Play, Loader2 } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { plainPreview } from "@/lib/utils";
import { CopyButton, MediaPreviewModal, TextResultModal, downloadUrl } from "@/components/ui/Modal";

/** Label of the node wired into `nodeId`'s `handleId` input, or null when nothing is connected. */
export function useInputSource(nodeId: string, handleId: string): string | null {
  return useWorkflowStore(s => {
    const edge = s.edges.find(e => e.target === nodeId && e.targetHandle === handleId);
    if (!edge) return null;
    const src = s.nodes.find(n => n.id === edge.source);
    return (src?.data.label as string) || src?.type || "another node";
  });
}

export function Field({ label, children, hint, right }: { label: string; children: ReactNode; hint?: ReactNode; right?: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label-row">
        <span className="field-label">{label}</span>
        {right}
      </div>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

/** Replaces an input's editor when a wire feeds it, so it's obvious where the value comes from. */
export function LinkedValue({ from }: { from: string }) {
  return (
    <div className="linked-value" title="This value comes from a connected node. Delete the wire to type it manually.">
      <Link2 size={12} />
      <span>From <strong>{from}</strong></span>
    </div>
  );
}

export function Pills<T extends string>({ options, value, onChange, format }: { options: readonly T[]; value: T; onChange: (v: T) => void; format?: (v: T) => string }) {
  return (
    <div className="pills nodrag" role="radiogroup">
      {options.map(o => (
        <button key={o} type="button" role="radio" aria-checked={value === o} className={`pill ${value === o ? "pill-active" : ""}`} onClick={() => onChange(o)}>
          {format ? format(o) : o}
        </button>
      ))}
    </div>
  );
}

export function TextResult({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="result">
      <div className="result-header">
        <span className="field-label">{title}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <CopyButton text={text} small />
          <button type="button" className="btn btn-secondary btn-xs nodrag" onClick={() => setOpen(true)}><Maximize2 size={11} /> Expand</button>
        </div>
      </div>
      <button type="button" className="result-text nodrag nowheel" onClick={() => setOpen(true)} title="Open full response">
        {plainPreview(text)}
      </button>
      <TextResultModal open={open} onClose={() => setOpen(false)} title={title} text={text} />
    </div>
  );
}

export function MediaResult({ title, url, kind, filename, meta }: { title: string; url: string; kind: "image" | "video"; filename: string; meta?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="result">
      <div className="result-header">
        <span className="field-label">{title}</span>
        {meta && <span className="field-hint" style={{ margin: 0 }}>{meta}</span>}
      </div>
      {kind === "image" ? (
         
        <img src={url} alt={title} className="media-thumb nodrag" onClick={() => setOpen(true)} />
      ) : (
        <video src={url} controls preload="metadata" className="media-thumb nodrag" />
      )}
      <div style={{ display: "flex", gap: 4 }}>
        <button type="button" className="btn btn-secondary btn-xs nodrag" onClick={() => downloadUrl(url, filename)}><Download size={11} /> Download</button>
        <button type="button" className="btn btn-secondary btn-xs nodrag" onClick={() => setOpen(true)}><Maximize2 size={11} /> View</button>
      </div>
      <MediaPreviewModal open={open} onClose={() => setOpen(false)} src={url} kind={kind} filename={filename} />
    </div>
  );
}

export function Skeleton({ height = 120, label }: { height?: number; label?: string }) {
  return (
    <div>
      <div className="skeleton" style={{ height, borderRadius: 8 }} />
      {label && <p className="field-hint" style={{ textAlign: "center", marginTop: 6 }}>{label}</p>}
    </div>
  );
}

/** Runs just this node (upstream results from earlier runs are reused). */
export function RunNodeButton({ nodeId, label = "Run node", disabled, disabledReason, running }: { nodeId: string; label?: string; disabled?: boolean; disabledReason?: string; running?: boolean }) {
  const workflowBusy = useWorkflowStore(s => s.isRunning);
  const isDisabled = disabled || workflowBusy;
  return (
    <button
      type="button"
      className="btn btn-node-run nodrag"
      disabled={isDisabled}
      title={disabled ? disabledReason : workflowBusy ? "A run is already in progress" : "Run only this node"}
      onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("run-single-node", { detail: { nodeId } })); }}
    >
      {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={11} fill="currentColor" />}
      {running ? "Running…" : label}
    </button>
  );
}
