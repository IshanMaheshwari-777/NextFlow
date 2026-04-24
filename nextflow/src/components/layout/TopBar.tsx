"use client";
import { useState, useRef, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { Play, Download, Upload, Loader2, Plus, ChevronDown, Pencil, Zap, History } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useRouter } from "next/navigation";

type Props = {
  allWorkflows: { id: string; name: string; updatedAt: Date }[];
};

export default function TopBar({ allWorkflows }: Props) {
  const { workflowId, workflowName, nodes, edges, isRunning, isRightOpen, setWorkflowName, exportAsJSON, importFromJSON, resetNodeStates, setIsRunning, setNodeResult, setIsRightOpen } = useWorkflowStore();
  const router = useRouter();
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(workflowName);
  const [showWf, setShowWf] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "idle">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); }, 2500);
    return () => clearTimeout(timer);
  }, [nodes, edges, workflowName]);

  const handleRun = async () => {
    if (isRunning || !workflowId || nodes.length === 0) return;
    setIsRunning(true); resetNodeStates();
    // Immediately mark all nodes as running for visual feedback
    const store = useWorkflowStore.getState();
    for (const node of nodes) {
      store.updateNodeData(node.id, { isRunning: true, runStatus: "running" });
    }
    setIsRightOpen(true);
    const runStart = performance.now();
    try {
      const res = await fetch(`/api/workflow/${workflowId}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nodes, edges, runMode: "full" }) });
      const data = await res.json();
      const elapsed = Math.round(performance.now() - runStart);
      console.log(`[frontend] Workflow run completed in ${elapsed}ms`, data.duration ? `(server: ${data.duration}ms)` : "");
      if (data.nodeResults) {
        for (const [nodeId, result] of Object.entries(data.nodeResults as Record<string, any>)) {
          setNodeResult(nodeId, result.status, result.output, result.error);
        }
      }
      const runsRes = await fetch(`/api/workflow/${workflowId}/runs`);
      if (runsRes.ok) { const { runs } = await runsRes.json(); useWorkflowStore.getState().setRunHistory(runs); }
    } catch (e) { console.error(e); } finally { setIsRunning(false); }
  };

  const handleExport = () => {
    const blob = new Blob([exportAsJSON()], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${workflowName}.json`; a.click();
  };

  const createNew = async () => {
    const res = await fetch("/api/workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New Workflow" }) });
    const data = await res.json(); if (data.id) router.push(`/workflow/${data.id}`);
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 20px", width: "100%", height: 56,
      background: "#0e0e14", borderBottom: "1px solid #1c1c28",
      userSelect: "none", flexShrink: 0,
    }}>
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(139,92,246,0.3)",
          }}>
            <Zap style={{ width: 16, height: 16, color: "#fff", fill: "#fff" }} />
          </div>
          <span style={{ color: "#fff", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>NextFlow</span>
        </div>

        <div style={{ width: 1, height: 24, background: "#1c1c28" }} />

        {/* Workflow name */}
        <div style={{ position: "relative" }}>
          {editingName ? (
            <input
              autoFocus
              style={{
                background: "#0c0c12", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8,
                outline: "none", fontSize: 14, padding: "6px 12px", width: 200, color: "#e4e4ed",
              }}
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { setWorkflowName(nameVal); setEditingName(false); } if (e.key === "Escape") setEditingName(false); }}
              onBlur={() => { setWorkflowName(nameVal); setEditingName(false); }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowWf(!showWf)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 14, color: "#e4e4ed", fontWeight: 500,
                background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
                borderRadius: 6,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#16161f")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workflowName}</span>
              <ChevronDown style={{ width: 14, height: 14, color: "#4a4a5e" }} />
            </button>
          )}

          {showWf && (
            <div style={{
              position: "absolute", top: 40, left: 0, zIndex: 200, width: 240,
              background: "rgba(14,14,20,0.97)", backdropFilter: "blur(16px)",
              border: "1px solid #1c1c28", borderRadius: 12,
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #1c1c28", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#4a4a5e", textTransform: "uppercase", letterSpacing: "0.1em" }}>Workflows</span>
                <button type="button" onClick={() => { setEditingName(true); setNameVal(workflowName); setShowWf(false); }} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <Pencil style={{ width: 12, height: 12, color: "#4a4a5e" }} />
                </button>
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto", padding: 4 }}>
                {allWorkflows.map(wf => (
                  <button
                    type="button" key={wf.id}
                    onClick={() => { router.push(`/workflow/${wf.id}`); setShowWf(false); }}
                    style={{
                      width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13,
                      color: wf.id === workflowId ? "#a78bfa" : "#8b8b9e",
                      fontWeight: wf.id === workflowId ? 600 : 400,
                      background: "none", border: "none", borderRadius: 8, cursor: "pointer",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#16161f")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wf.name}</p>
                    <p suppressHydrationWarning style={{ margin: "2px 0 0", fontSize: 10, color: "#4a4a5e" }}>{new Date(wf.updatedAt).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { createNew(); setShowWf(false); }} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 12px", fontSize: 12, color: "#4a4a5e", background: "none", border: "none",
                borderTop: "1px solid #1c1c28", cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#16161f"; e.currentTarget.style.color = "#8b8b9e"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#4a4a5e"; }}
              >
                <Plus style={{ width: 14, height: 14 }} />New Workflow
              </button>
            </div>
          )}
        </div>

        {saveStatus === "saved" && (
          <span style={{ fontSize: 12, color: "#4a4a5e", fontWeight: 500 }}>Saved</span>
        )}
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => importFromJSON(ev.target?.result as string); r.readAsText(f); }} />

        <button type="button" onClick={handleExport} style={{
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#4a4a5e", background: "#12121a", border: "1px solid #1c1c28", borderRadius: 8, cursor: "pointer",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#8b8b9e"; e.currentTarget.style.borderColor = "#2e2e3e"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#4a4a5e"; e.currentTarget.style.borderColor = "#1c1c28"; }}
        title="Export">
          <Download style={{ width: 16, height: 16 }} />
        </button>

        <button type="button" onClick={() => fileRef.current?.click()} style={{
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#4a4a5e", background: "#12121a", border: "1px solid #1c1c28", borderRadius: 8, cursor: "pointer",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#8b8b9e"; e.currentTarget.style.borderColor = "#2e2e3e"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#4a4a5e"; e.currentTarget.style.borderColor = "#1c1c28"; }}
        title="Import">
          <Upload style={{ width: 16, height: 16 }} />
        </button>

        <div style={{ width: 1, height: 28, background: "#1c1c28", margin: "0 8px" }} />

        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning || nodes.length === 0}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 20px", fontSize: 14, fontWeight: 600,
            color: "#fff", background: isRunning ? "#16161f" : "#12121a",
            border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8,
            cursor: isRunning || nodes.length === 0 ? "not-allowed" : "pointer",
            opacity: nodes.length === 0 ? 0.4 : 1,
            boxShadow: isRunning ? "none" : "0 0 20px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.03)",
            transition: "all 150ms ease",
          }}
        >
          {isRunning ? <><Loader2 style={{ width: 14, height: 14, color: "#a78bfa", animation: "spin 1s linear infinite" }} />Running...</> : <><Play style={{ width: 14, height: 14, fill: "#fff" }} />Run Workflow</>}
        </button>

        {!isRightOpen && (
          <button
            type="button" onClick={() => setIsRightOpen(true)}
            style={{
              width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#4a4a5e", background: "#12121a", border: "1px solid #1c1c28", borderRadius: 8, cursor: "pointer",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#8b8b9e"; e.currentTarget.style.borderColor = "#2e2e3e"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#4a4a5e"; e.currentTarget.style.borderColor = "#1c1c28"; }}
            title="Show run history"
          >
            <History style={{ width: 16, height: 16 }} />
          </button>
        )}

        <div style={{ marginLeft: 8 }}>
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
        </div>
      </div>
    </div>
  );
}
