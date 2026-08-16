"use client";
import { useState } from "react";
import { History, ChevronsRight } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useShallow } from "zustand/react/shallow";
import { formatDuration } from "@/lib/utils";
import type { WorkflowRunRecord } from "@nextflow/shared/types";

function StatusDot({ status, size = 8 }: { status: string; size?: number }) {
  const colors: Record<string, string> = {
    success: "#34d399", failed: "#f87171", running: "#fbbf24", pending: "#2e2e3e",
  };
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: colors[status] || colors.pending,
      flexShrink: 0,
      boxShadow: status === "running" ? `0 0 8px ${colors.running}50` : "none",
    }} />
  );
}

export default function RightSidebar() {
  const { runHistory, selectedRunId, setSelectedRunId, isRightOpen, setIsRightOpen } = useWorkflowStore(
    useShallow(s => ({ runHistory: s.runHistory, selectedRunId: s.selectedRunId, setSelectedRunId: s.setSelectedRunId, isRightOpen: s.isRightOpen, setIsRightOpen: s.setIsRightOpen }))
  );

  const activeRunId = selectedRunId || (runHistory.length > 0 ? runHistory[0].id : null);
  const activeRun = runHistory.find(r => r.id === activeRunId);
  const otherRuns = runHistory.filter(r => r.id !== activeRunId);

  return (
    <div style={{
      flexShrink: 0, height: "100%", display: "flex", flexDirection: "column",
      background: "var(--surface)", borderLeft: isRightOpen ? "1px solid var(--border)" : "none",
      width: isRightOpen ? 280 : 0, minWidth: isRightOpen ? 280 : 0,
      transition: "width 200ms cubic-bezier(0.4,0,0.2,1), min-width 200ms cubic-bezier(0.4,0,0.2,1)",
      overflow: "hidden", zIndex: 40,
    }}>
      {/* Header */}
      <div style={{ padding: "16px 18px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, minWidth: 280 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <History style={{ width: 14, height: 14, color: "var(--text-muted)" }} />
          <h2 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>Run History</h2>
        </div>
        <button
          type="button" onClick={() => setIsRightOpen(false)}
          style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--input-bg)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
          title="Collapse panel"
        >
          <ChevronsRight style={{ width: 14, height: 14 }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minWidth: 280 }}>
        {activeRun ? (
          <div>
            {/* Active Run */}
            <div style={{ padding: "12px 18px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <StatusDot status={activeRun.status} size={10} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                      Run #{runHistory.length - runHistory.findIndex(r => r.id === activeRun.id)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <StatusBadge status={activeRun.status} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{activeRun.nodeRuns?.length || 0} nodes</span>
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{formatDuration(activeRun.duration)}</span>
              </div>
            </div>

            {/* Node Execution Tree */}
            <div style={{ padding: "0 18px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
                Node Execution
              </div>
              <div style={{ position: "relative", borderLeft: "2px solid var(--border)", marginLeft: 6, paddingLeft: 18, paddingBottom: 4 }}>
                {(activeRun.nodeRuns || []).map((nr, i) => {
                  const outputPreview = nr.output && typeof nr.output === "object" && Object.values(nr.output)[0];
                  return (
                    <div key={nr.id} style={{ position: "relative", marginBottom: i < (activeRun.nodeRuns?.length || 0) - 1 ? 20 : 0 }}>
                      {/* Dot on the timeline */}
                      <div style={{
                        position: "absolute", left: -25, top: 4,
                        width: 10, height: 10, borderRadius: "50%",
                        border: "2px solid var(--surface)",
                        background: nr.status === "success" ? "#34d399" : nr.status === "running" ? "#fbbf24" : nr.status === "failed" ? "#f87171" : "#2e2e3e",
                        boxShadow: nr.status === "running" ? "0 0 8px rgba(251,191,36,0.4)" : "none",
                      }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: nr.status === "pending" ? "var(--text-muted)" : "var(--text-secondary)" }}>
                        {nr.nodeLabel || nr.nodeType}
                      </div>
                      {nr.status === "success" && outputPreview && (
                        <div style={{
                          fontSize: 11, color: "var(--text-muted)", marginTop: 3,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200,
                        }}>
                          → {String(outputPreview).length > 45 ? String(outputPreview).slice(0, 45) + "..." : String(outputPreview)}
                        </div>
                      )}
                      {nr.status === "running" && <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 3, fontWeight: 500 }}>Running...</div>}
                      {nr.status === "pending" && <div style={{ fontSize: 11, color: "#2e2e3e", marginTop: 3 }}>Waiting...</div>}
                      {/* FIX 3: Show error expanded by default for failed nodes */}
                      {nr.status === "failed" && nr.error && (
                        <div style={{ fontSize: 11, color: "#f87171", marginTop: 6, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, padding: "6px 8px", lineHeight: 1.5, wordBreak: "break-word" }}>
                          {nr.error}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Other Runs */}
            {otherRuns.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                {otherRuns.map((run) => <RunCard key={run.id} run={run} runNumber={runHistory.length - runHistory.findIndex(r => r.id === run.id)} onSelect={() => setSelectedRunId(run.id)} />)}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 280, textAlign: "center" }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "var(--surface)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
            }}>
              <History style={{ width: 20, height: 20, color: "#2e2e3e" }} />
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, margin: 0 }}>No runs yet</p>
            <p style={{ fontSize: 11, color: "#2e2e3e", marginTop: 6 }}>Click Run Workflow to test</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    success: { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.2)" },
    failed: { bg: "rgba(248,113,113,0.1)", color: "#f87171", border: "rgba(248,113,113,0.2)" },
    running: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.2)" },
    partial: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.2)" },
  };
  const s = styles[status] || styles.running;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {status}
    </span>
  );
}

function RunCard({ run, runNumber, onSelect }: { run: WorkflowRunRecord; runNumber: number; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", textAlign: "left", padding: "12px 18px",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        background: hovered ? "var(--surface)" : "transparent",
        border: "none", cursor: "pointer", transition: "background 150ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <StatusDot status={run.status} size={8} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: hovered ? "var(--text)" : "var(--text-secondary)", transition: "color 150ms ease" }}>
            Run #{runNumber}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <StatusBadge status={run.status} />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{run.nodeRuns?.length || 0} nodes</span>
          </div>
        </div>
      </div>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{formatDuration(run.duration)}</span>
    </button>
  );
}
