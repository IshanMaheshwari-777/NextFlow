"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronDown, CheckCircle2, XCircle, Loader2, Clock, History, X } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { NodeRunRecord } from "@/types";
import { formatDuration, formatTimestamp, getStatusBg } from "@/lib/utils";

function StatusIcon({ status, sm }: { status: string; sm?: boolean }) {
  const cls = sm ? "w-3 h-3" : "w-3.5 h-3.5";
  if (status === "success") return <CheckCircle2 className={`${cls} text-emerald-400`} />;
  if (status === "failed") return <XCircle className={`${cls} text-red-400`} />;
  if (status === "running") return <Loader2 className={`${cls} text-amber-400 animate-spin`} />;
  return <Clock className={`${cls} text-[#4E5264]`} />;
}

function NodeRow({ nodeRun }: { nodeRun: NodeRunRecord }) {
  const [open, setOpen] = useState(false);
  const hasOutput = nodeRun.output && Object.keys(nodeRun.output).length > 0;
  return (
    <div className={`rounded-lg border border-white/[0.04] overflow-hidden bg-white/[0.02] ${hasOutput ? "cursor-pointer" : ""}`} onClick={() => hasOutput && setOpen(!open)}>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <StatusIcon status={nodeRun.status} sm />
        <div className="flex-1 min-w-0"><p className="text-[11px] text-[#EAEDF3] font-medium truncate">{nodeRun.nodeLabel || nodeRun.nodeType}</p></div>
        <span className="text-[10px] text-[#4E5264] shrink-0">{formatDuration(nodeRun.duration)}</span>
        {hasOutput && (open ? <ChevronDown className="w-3 h-3 text-[#4E5264] shrink-0" /> : <ChevronRight className="w-3 h-3 text-[#4E5264] shrink-0" />)}
      </div>
      {open && hasOutput && (
        <div className="px-3 pb-2 border-t border-white/[0.04]">
          {Object.entries(nodeRun.output || {}).map(([k, v]) => (
            <div key={k} className="mt-1.5">
              <p className="text-[9px] text-[#4E5264] uppercase font-medium">{k}</p>
              <p className="text-[10px] text-[#8B8FA3] break-all leading-relaxed">{typeof v === "string" && v.length > 120 ? v.slice(0, 120) + "…" : String(v)}</p>
            </div>
          ))}
        </div>
      )}
      {nodeRun.error && <div className="px-3 pb-2 border-t border-white/[0.04]"><p className="text-[10px] text-red-400 mt-1.5">{nodeRun.error}</p></div>}
    </div>
  );
}

type Props = { open: boolean; onClose: () => void };

export default function RunHistoryPanel({ open, onClose }: Props) {
  const { runHistory, selectedRunId, setSelectedRunId } = useWorkflowStore();
  const selectedRun = runHistory.find(r => r.id === selectedRunId);
  const panelRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="fixed top-14 right-4 z-[80] w-[300px] max-h-[calc(100vh-120px)] bg-[#111217]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-in slide-in-from-right-2 fade-in duration-200"
    >
      <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-[#7C5CFF]" />
          <h2 className="text-[11px] font-semibold text-[#8B8FA3] uppercase tracking-widest">Run History</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {selectedRun && <button type="button" onClick={() => setSelectedRunId(null)} className="text-[10px] text-[#4E5264] hover:text-[#8B8FA3] transition-colors">← Back</button>}
          <button type="button" onClick={onClose}><X className="w-3.5 h-3.5 text-[#4E5264] hover:text-white transition-colors" /></button>
        </div>
      </div>

      {selectedRun ? (
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-3 border-b border-white/[0.04] space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${getStatusBg(selectedRun.status)}`}>{selectedRun.status.toUpperCase()}</span>
              <span className="text-[10px] text-[#4E5264]">{formatDuration(selectedRun.duration)}</span>
            </div>
            <p suppressHydrationWarning className="text-[11px] text-[#8B8FA3]">{formatTimestamp(selectedRun.startedAt)}</p>
          </div>
          <div className="px-2 py-2 space-y-1.5">
            {(selectedRun.nodeRuns || []).map((nr) => <NodeRow key={nr.id} nodeRun={nr} />)}
          </div>
        </div>
      ) : runHistory.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
          <History className="w-8 h-8 text-[#4E5264]/40 mb-3" />
          <p className="text-sm text-[#8B8FA3]/60 font-medium">No runs yet</p>
          <p className="text-[11px] text-[#4E5264] mt-1.5">Click Run to execute your workflow</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-1 px-1.5">
          {runHistory.map((run, i) => (
            <button type="button" key={run.id} onClick={() => setSelectedRunId(run.id)} className="w-full text-left px-3 py-2.5 hover:bg-white/[0.04] rounded-lg transition-all duration-100 group mb-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusIcon status={run.status} />
                  <div className="min-w-0">
                    <p className="text-xs text-[#EAEDF3] font-medium">Run #{runHistory.length - i}</p>
                    <p suppressHydrationWarning className="text-[10px] text-[#4E5264] truncate">{formatTimestamp(run.startedAt)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium ${getStatusBg(run.status)}`}>{run.status}</span>
                  <span className="text-[10px] text-[#4E5264]">{formatDuration(run.duration)}</span>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[9px] text-[#4E5264] bg-white/[0.03] rounded px-1.5 py-0.5 border border-white/[0.06]">{run.runMode}</span>
                <span className="text-[9px] text-[#4E5264]">{run.nodeRuns?.length || 0} nodes</span>
                <ChevronRight className="w-3 h-3 text-[#4E5264] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
