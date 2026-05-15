"use client";
import { useState } from "react";
import { History, X, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { formatDuration } from "@/lib/utils";

type Props = { open: boolean; onClose: () => void };

function StatusDot({ status, size = 8 }: { status: string; size?: number }) {
  const colors: Record<string, string> = { success: "#34d399", failed: "#f87171", running: "#fbbf24", pending: "#333" };
  return <div style={{ width: size, height: size, borderRadius: "50%", background: colors[status] || colors.pending, flexShrink: 0, boxShadow: status === "running" ? `0 0 8px ${colors.running}50` : "none" }} />;
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, { bg: string; color: string; border: string }> = {
    success: { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.2)" },
    failed: { bg: "rgba(248,113,113,0.1)", color: "#f87171", border: "rgba(248,113,113,0.2)" },
    running: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.2)" },
    partial: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.2)" },
  };
  const st = s[status] || s.running;
  return <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{status}</span>;
}

export default function RunHistoryPanel({ open, onClose }: Props) {
  const { runHistory, selectedRunId, setSelectedRunId } = useWorkflowStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const displayId = activeId || selectedRunId || (runHistory.length > 0 ? runHistory[0].id : null);
  const activeRun = runHistory.find(r => r.id === displayId);
  const otherRuns = runHistory.filter(r => r.id !== displayId);

  return (
    <>
      {/* Backdrop */}
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 98, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }} />}

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, width: 300, height: "100vh", zIndex: 99,
        background: "var(--sidebar)", borderLeft: "1px solid var(--border)",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
        display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 220ms cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <History size={13} color="var(--text-muted)" />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)" }}>Run History</span>
          </div>
          <button onClick={onClose} className="ghost-btn" style={{ width: 26, height: 26 }}><X size={14} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {runHistory.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 280, textAlign: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <History size={20} color="var(--text-dim)" />
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>No runs yet</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-dim)" }}>Click Run to test your workflow</p>
            </div>
          ) : (
            <>
              {activeRun && (
                <div style={{ padding: "14px 16px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <StatusDot status={activeRun.status} size={10} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                        Run #{runHistory.length - runHistory.findIndex(r => r.id === activeRun.id)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <StatusBadge status={activeRun.status} />
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{activeRun.nodeRuns?.length || 0} nodes</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDuration(activeRun.duration)}</span>
                  </div>

                  {/* Node timeline */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Node Execution</div>
                  <div style={{ borderLeft: "2px solid var(--border)", marginLeft: 6, paddingLeft: 16 }}>
                    {(activeRun.nodeRuns || []).map((nr, i) => {
                      const outputPreview = nr.output && typeof nr.output === "object" && Object.values(nr.output)[0];
                      return (
                        <div key={nr.id} style={{ position: "relative", marginBottom: i < (activeRun.nodeRuns?.length || 0) - 1 ? 18 : 0 }}>
                          <div style={{ position: "absolute", left: -22, top: 4, width: 10, height: 10, borderRadius: "50%", border: "2px solid var(--sidebar)", background: nr.status === "success" ? "#34d399" : nr.status === "running" ? "#fbbf24" : nr.status === "failed" ? "#f87171" : "var(--border)" }} />
                          <div style={{ fontSize: 13, fontWeight: 600, color: nr.status === "pending" ? "var(--text-muted)" : "var(--text-secondary)" }}>{nr.nodeLabel || nr.nodeType}</div>
                          {nr.status === "success" && outputPreview && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>→ {String(outputPreview).length > 40 ? String(outputPreview).slice(0, 40) + "…" : String(outputPreview)}</div>}
                          {nr.status === "running" && <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 2 }}>Running…</div>}
                          {nr.status === "failed" && nr.error && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 6, padding: "4px 8px", lineHeight: 1.5, wordBreak: "break-word" }}>{nr.error}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {otherRuns.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  {otherRuns.map(run => {
                    const runNum = runHistory.length - runHistory.findIndex(r => r.id === run.id);
                    return (
                      <button key={run.id} onClick={() => { setActiveId(run.id); setSelectedRunId(run.id); }} style={{ width: "100%", textAlign: "left", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", transition: "background 100ms" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--nav-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <StatusDot status={run.status} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Run #{runNum}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                              <StatusBadge status={run.status} />
                              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{run.nodeRuns?.length || 0} nodes</span>
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDuration(run.duration)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
