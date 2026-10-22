"use client";
import { useState } from "react";
import { History, X, ChevronRight, ChevronDown } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useShallow } from "zustand/react/shallow";
import { formatDuration, formatRelative, plainPreview } from "@/lib/utils";
import { useEscapeClose } from "@/lib/useEscapeClose";
import type { NodeRunRecord, WorkflowRunRecord } from "@nextflow/shared/types";

type Props = { open: boolean; onClose: () => void };

const MODE_LABEL: Record<string, string> = { full: "Full run", selected: "Selected nodes", single: "Single node" };

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status}`}>{status === "partial" ? "partial" : status}</span>;
}

function outputPreview(nr: NodeRunRecord): { text?: string; image?: string } {
  const o = nr.output as Record<string, unknown> | undefined;
  if (!o) return {};
  const img = (o.imageUrl as string) || undefined;
  if (img) return { image: img };
  const t = (o.text as string) || (typeof o.output === "string" ? o.output : undefined);
  return t ? { text: plainPreview(t).replace(/\s+/g, " ") } : {};
}

function RunDetail({ run }: { run: WorkflowRunRecord }) {
  return (
    <div className="timeline">
      {(run.nodeRuns || []).length === 0 && <p className="field-hint">No nodes recorded for this run.</p>}
      {(run.nodeRuns || []).map(nr => {
        const p = outputPreview(nr);
        return (
          <div key={nr.id} className="timeline-item">
            <span className={`timeline-dot status-${nr.status}`} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="timeline-head">
                <span className="truncate">{nr.nodeLabel || nr.nodeType}</span>
                <span className="timeline-time">{nr.status === "running" ? "running…" : formatDuration(nr.duration)}</span>
              </div>
              {nr.status === "success" && p.text && <p className="timeline-out">{p.text.slice(0, 140)}{p.text.length > 140 ? "…" : ""}</p>}
              { }
              {nr.status === "success" && p.image && <img src={p.image} alt="" className="timeline-img" />}
              {nr.status === "failed" && nr.error && <p className="timeline-err">{nr.error}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RunHistoryPanel({ open, onClose }: Props) {
  const { runHistory } = useWorkflowStore(useShallow(s => ({ runHistory: s.runHistory })));
  const [expanded, setExpanded] = useState<string | null>(null);
  useEscapeClose(onClose, open);
  const openId = expanded ?? runHistory[0]?.id ?? null;

  return (
    <>
      {open && <div onClick={onClose} aria-hidden="true" className="drawer-backdrop" />}
      <aside role="dialog" aria-modal="true" aria-label="Run history" aria-hidden={!open} className={`drawer ${open ? "is-open" : ""}`} inert={!open}>
        <div className="drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <History size={15} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Run history</span>
            {runHistory.length > 0 && <span className="count-pill">{runHistory.length}</span>}
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close run history"><X size={15} /></button>
        </div>

        <div className="drawer-body">
          {runHistory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><History size={20} /></div>
              <p className="empty-state-title">No runs yet</p>
              <p className="empty-state-sub">Press <kbd>⌘ Enter</kbd> or the Run button. Every run is recorded here with each node&apos;s output and timing.</p>
            </div>
          ) : runHistory.map((run, i) => {
            const isOpen = run.id === openId;
            const failed = run.nodeRuns?.filter(n => n.status === "failed").length ?? 0;
            return (
              <div key={run.id} className={`run-row ${isOpen ? "is-open" : ""}`}>
                <button className="run-row-head" onClick={() => setExpanded(isOpen ? "" : run.id)} aria-expanded={isOpen}>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="run-title">Run #{runHistory.length - i}</span>
                      <StatusBadge status={run.status} />
                    </div>
                    <div className="run-meta" suppressHydrationWarning>
                      {formatRelative(run.createdAt)} · {MODE_LABEL[run.runMode] ?? run.runMode} · {run.nodeRuns?.length ?? 0} node{(run.nodeRuns?.length ?? 0) === 1 ? "" : "s"}{failed > 0 ? ` · ${failed} failed` : ""}
                    </div>
                  </div>
                  <span className="timeline-time">{formatDuration(run.duration)}</span>
                </button>
                {isOpen && <RunDetail run={run} />}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
