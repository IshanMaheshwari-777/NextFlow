"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import Link from "next/link";
import { Play, Download, Upload, Loader2, Plus, ChevronDown, Pencil, Zap, History, Undo2, Redo2, AlertTriangle, XCircle, Sparkles } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useRouter } from "next/navigation";

type Props = {
  allWorkflows: { id: string; name: string; updatedAt: Date }[];
};

export default function TopBar({ allWorkflows }: Props) {
  const { 
    workflowId, workflowName, nodes, edges, isRunning, isRightOpen, past, future, cooldownEnd,
    setWorkflowName, setNodes, setEdges, saveSnapshot, exportAsJSON, importFromJSON, 
    resetNodeStates, setIsRunning, setNodeResult, setIsRightOpen, updateNodeData, undo, redo 
  } = useWorkflowStore();
  const router = useRouter();
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(workflowName);
  const [showWf, setShowWf] = useState(false);
  const [showRunMenu, setShowRunMenu] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "idle">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  // FIX 3: Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "error" | "warning" } | null>(null);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);
  const showToast = useCallback((message: string, type: "error" | "warning") => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun("full");
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const handleRunSingle = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { nodeId } = customEvent.detail;
      handleRun("single", [nodeId]);
    };
    window.addEventListener("run-single-node", handleRunSingle);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("run-single-node", handleRunSingle);
    };
  }, [isRunning, workflowId, nodes, edges]);

  useEffect(() => {
    const timer = setTimeout(() => { setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); }, 2500);
    return () => clearTimeout(timer);
  }, [nodes, edges, workflowName]);

  // Polling mechanism during workflow run — only for run history, NOT node states
  // Node states are driven by SSE events from the run API
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    if (isRunning && workflowId) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/workflow/${workflowId}/runs`);
          if (res.ok) {
            const { runs } = await res.json();
            useWorkflowStore.getState().setRunHistory(runs);
          }
        } catch (e) {
          console.error("[frontend] Polling error:", e);
        }
      }, 2000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isRunning, workflowId]);

  const handleRun = async (mode: "full" | "selected" | "single" = "full", overrideNodeIds?: string[]) => {
    if (isRunning || !workflowId || nodes.length === 0) return;
    setShowRunMenu(false);

    let selectedNodeIds = overrideNodeIds || [];

    if (mode === "selected") {
      selectedNodeIds = nodes.filter((n: any) => n.selected).map(n => n.id);
      if (selectedNodeIds.length === 0) return;
    }

    // Cooldown check for generate-image nodes
    const targetedImageNodes = nodes.filter(n => 
      n.type === "generate-image" && 
      (mode === "full" || selectedNodeIds.includes(n.id))
    );

    if (targetedImageNodes.length > 0 && cooldownEnd > Date.now()) {
      const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      showToast(`Image generation cooldown active. Please wait ${timeStr}.`, "warning");
      return;
    }

    // Reset all node states — do NOT set any node to isRunning here.
    // The SSE stream will tell us exactly which nodes are executing.
    resetNodeStates();
    setIsRunning(true);
    setIsRightOpen(true);
    const runStart = performance.now();
    try {
      // Strip base64 fileData from nodes before sending
      const cleanNodes = nodes.map(n => ({
        ...n,
        data: { ...n.data, fileData: undefined, previewUrl: undefined },
      }));
      const res = await fetch(`/api/workflow/${workflowId}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nodes: cleanNodes, edges, runMode: mode, selectedNodeIds }) });
      // Handle non-JSON error responses gracefully
      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        console.error(`[frontend] API error ${res.status}:`, errText);
        throw new Error(`Workflow run failed (${res.status})`);
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && res.body) {
        // ─── SSE Streaming: update each node incrementally ───
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || ""; // keep incomplete event in buffer

          for (const part of parts) {
            if (!part.trim()) continue;
            const lines = part.split("\n");
            let eventType = "";
            let dataStr = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) eventType = line.slice(7);
              if (line.startsWith("data: ")) dataStr += line.slice(6);
            }
            if (!eventType || !dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              const store = useWorkflowStore.getState();

              switch (eventType) {
                case "node-start":
                  // THIS node starts pulsing NOW
                  store.updateNodeData(data.nodeId, { isRunning: true, runStatus: "running", runError: undefined, runOutput: undefined });
                  break;

                case "node-complete":
                  // THIS node stops pulsing NOW, result renders immediately
                  store.setNodeResult(data.nodeId, data.status, data.output, data.error);
                  break;

                case "workflow-complete":
                  if (data.status === "failed") {
                    showToast("Workflow run failed. Check node errors for details.", "error");
                  } else if (data.status === "partial") {
                    showToast("Some nodes failed during the workflow run.", "warning");
                  }
                  break;

                case "error":
                  showToast(data.error || "Workflow run failed.", "error");
                  break;
              }
            } catch (parseErr) {
              console.error("[frontend] SSE parse error:", parseErr);
            }
          }
        }
      } else {
        // ─── Fallback: JSON response (non-SSE) ───
        const data = await res.json();
        const elapsed = Math.round(performance.now() - runStart);
        console.log(`[frontend] Workflow run completed in ${elapsed}ms`, data.duration ? `(server: ${data.duration}ms)` : "");
        if (data.nodeResults) {
          for (const [nodeId, result] of Object.entries(data.nodeResults as Record<string, any>)) {
            setNodeResult(nodeId, result.status, result.output, result.error);
          }
        }
        if (data.status === "failed") {
          showToast("Workflow run failed. Check node errors for details.", "error");
        } else if (data.status === "partial") {
          showToast("Some nodes failed during the workflow run.", "warning");
        }
      }

      // Refresh run history
      const runsRes = await fetch(`/api/workflow/${workflowId}/runs`);
      if (runsRes.ok) { const { runs } = await runsRes.json(); useWorkflowStore.getState().setRunHistory(runs); }
    } catch (e: any) {
      console.error("[frontend] Run error:", e?.message || e);
      showToast("Workflow run failed. Check node errors for details.", "error");
      // Mark all still-running nodes as failed
      const currentNodes = useWorkflowStore.getState().nodes;
      const store = useWorkflowStore.getState();
      for (const node of currentNodes) {
        const nd = node.data as any;
        if (nd.isRunning) {
          store.setNodeResult(node.id, "failed", undefined, e?.message || "Workflow run failed");
        }
      }
    } finally { setIsRunning(false); }
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
        <Link
          href="/dashboard"
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textDecoration: "none", transition: "opacity 150ms ease" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(139,92,246,0.3)",
          }}>
            <Zap style={{ width: 16, height: 16, color: "#fff", fill: "#fff" }} />
          </div>
          <span style={{ color: "#fff", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>NextFlow</span>
        </Link>

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
        {/* AI Workflow Generator */}
        <AIWorkflowGenerator />
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

        <button type="button" onClick={undo} disabled={past.length === 0} style={{
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          color: past.length === 0 ? "#4a4a5e" : "#8b8b9e", background: "#12121a", border: "1px solid #1c1c28", borderRadius: 8,
          cursor: past.length === 0 ? "not-allowed" : "pointer",
          opacity: past.length === 0 ? 0.3 : 1,
        }}
          onMouseEnter={e => { if (past.length > 0) { e.currentTarget.style.color = "#e4e4ed"; e.currentTarget.style.borderColor = "#2e2e3e"; } }}
          onMouseLeave={e => { if (past.length > 0) { e.currentTarget.style.color = "#8b8b9e"; e.currentTarget.style.borderColor = "#1c1c28"; } }}
          title="Undo (Cmd+Z)">
          <Undo2 style={{ width: 16, height: 16 }} />
        </button>

        <button type="button" onClick={redo} disabled={future.length === 0} style={{
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          color: future.length === 0 ? "#4a4a5e" : "#8b8b9e", background: "#12121a", border: "1px solid #1c1c28", borderRadius: 8,
          cursor: future.length === 0 ? "not-allowed" : "pointer",
          opacity: future.length === 0 ? 0.3 : 1,
        }}
          onMouseEnter={e => { if (future.length > 0) { e.currentTarget.style.color = "#e4e4ed"; e.currentTarget.style.borderColor = "#2e2e3e"; } }}
          onMouseLeave={e => { if (future.length > 0) { e.currentTarget.style.color = "#8b8b9e"; e.currentTarget.style.borderColor = "#1c1c28"; } }}
          title="Redo (Cmd+Shift+Z)">
          <Redo2 style={{ width: 16, height: 16 }} />
        </button>

        <div style={{ width: 1, height: 28, background: "#1c1c28", margin: "0 8px" }} />

        <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
          <button
            type="button"
            onClick={() => handleRun("full")}
            disabled={isRunning || nodes.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", fontSize: 14, fontWeight: 600,
              color: "#fff", background: isRunning ? "#16161f" : "#12121a",
              border: "1px solid rgba(139,92,246,0.3)", borderRight: "none",
              borderRadius: "8px 0 0 8px",
              cursor: isRunning || nodes.length === 0 ? "not-allowed" : "pointer",
              opacity: nodes.length === 0 ? 0.4 : 1,
              boxShadow: isRunning ? "none" : "0 0 20px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.03)",
              transition: "all 150ms ease",
            }}
          >
            {isRunning ? <><Loader2 className="animate-spin" style={{ width: 14, height: 14, color: "#a78bfa" }} />Running...</> : <><Play style={{ width: 14, height: 14, fill: "#fff" }} />Run</>}
          </button>

          <button
            type="button"
            onClick={() => setShowRunMenu(!showRunMenu)}
            disabled={isRunning || nodes.length === 0}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "8px", height: "37px",
              color: "#fff", background: isRunning ? "#16161f" : "#12121a",
              border: "1px solid rgba(139,92,246,0.3)", borderLeft: "1px solid rgba(139,92,246,0.15)",
              borderRadius: "0 8px 8px 0",
              cursor: isRunning || nodes.length === 0 ? "not-allowed" : "pointer",
              opacity: nodes.length === 0 ? 0.4 : 1,
              boxShadow: isRunning ? "none" : "0 0 20px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            <ChevronDown style={{ width: 14, height: 14 }} />
          </button>

          {showRunMenu && (
            <div style={{
              position: "absolute", top: 44, right: 0, zIndex: 300, minWidth: 200,
              background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)", padding: 4
            }}>
              <button
                onClick={() => handleRun("full")}
                style={{
                  width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 12,
                  background: "transparent", color: "#ccc", border: "none", borderRadius: 4, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#1a1a1a"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span>▶ Run Full Workflow</span>
                <span style={{ opacity: 0.5, fontSize: 10 }}>⌘Enter</span>
              </button>

              <button
                onClick={() => handleRun("selected")}
                disabled={nodes.filter((n: any) => n.selected).length === 0}
                style={{
                  width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 12,
                  background: "transparent", color: nodes.filter((n: any) => n.selected).length === 0 ? "#555" : "#ccc",
                  border: "none", borderRadius: 4,
                  cursor: nodes.filter((n: any) => n.selected).length === 0 ? "not-allowed" : "pointer"
                }}
                onMouseEnter={e => { if (nodes.filter((n: any) => n.selected).length > 0) e.currentTarget.style.background = "#1a1a1a"; }}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                ▶ Run Selected Nodes
              </button>
            </div>
          )}
        </div>

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
          <UserButton appearance={{
            baseTheme: dark,
            variables: {
              colorBackground: "#12121a",
              colorInputBackground: "#0c0c12",
              colorText: "#e4e4ed",
              colorTextSecondary: "#8b8b9e",
              colorPrimary: "#8b5cf6",
              colorDanger: "#f87171",
            },
            elements: {
              userButtonAvatarBox: "w-8 h-8",
              userButtonPopoverCard: "bg-[#12121a] border border-[#1c1c28]",
              userPreviewSecondaryIdentifier: "text-[#8b8b9e]"
            }
          }} />
        </div>
      </div>

      {/* FIX 3: Toast notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 18px", borderRadius: 12,
          background: toast.type === "error" ? "rgba(248,113,113,0.1)" : "rgba(251,191,36,0.1)",
          border: `1px solid ${toast.type === "error" ? "rgba(248,113,113,0.3)" : "rgba(251,191,36,0.3)"}`,
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: "slideUp 0.2s ease",
        }}>
          {toast.type === "error" ? (
            <XCircle style={{ width: 16, height: 16, color: "#f87171", flexShrink: 0 }} />
          ) : (
            <AlertTriangle style={{ width: 16, height: 16, color: "#fbbf24", flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 13, color: toast.type === "error" ? "#f87171" : "#fbbf24", fontWeight: 500 }}>
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => { setToast(null); if (toastTimeout.current) clearTimeout(toastTimeout.current); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#4a4a5e", marginLeft: 4, display: "flex" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}

function AIWorkflowGenerator() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const { nodes, edges, setNodes, setEdges, saveSnapshot } = useWorkflowStore();

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/workflow/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nodes && data.edges) {
          saveSnapshot();
          
          // Safely remap IDs to avoid clashes with existing nodes
          const idMap = new Map<string, string>();
          const mappedNodes = data.nodes.map((n: any) => {
            const newId = `${n.type}-${Math.random().toString(36).substr(2, 9)}`;
            idMap.set(n.id, newId);
            return { ...n, id: newId };
          });
          
          const mappedEdges = data.edges.map((e: any) => ({
            ...e,
            id: `e-${idMap.get(e.source) || e.source}-${idMap.get(e.target) || e.target}`,
            source: idMap.get(e.source) || e.source,
            target: idMap.get(e.target) || e.target,
          }));

          setNodes([...nodes, ...mappedNodes]);
          setEdges([...edges, ...mappedEdges]);
          setOpen(false);
          setPrompt("");
        }
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8,
          background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
          color: "#a78bfa", fontSize: 12, fontWeight: 600, cursor: "pointer",
          transition: "all 150ms ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.15)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(139,92,246,0.1)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)"; }}
      >
        <Sparkles style={{ width: 14, height: 14 }} />
        AI Generate
      </button>

      {open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(5,5,10,0.8)", backdropFilter: "blur(12px)",
          animation: "fadeIn 0.2s ease",
        }} onClick={() => setOpen(false)}>
          <div style={{
            width: "min(480px, 90vw)", background: "#0e0e14", border: "1px solid #1c1c28",
            borderRadius: 16, padding: "24px", boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles style={{ width: 16, height: 16, color: "#a78bfa" }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>Generate Workflow</h3>
            </div>
            
            <p style={{ fontSize: 13, color: "#8b8b9e", marginBottom: 20, lineHeight: 1.5 }}>
              Describe the workflow you want to build. AI will generate the necessary nodes and connections for you.
            </p>

            <textarea
              autoFocus
              placeholder="Build AI workflow with video frame extraction, image cropping, prompt enhancement, LLM processing, and image generation nodes."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              style={{
                width: "100%", minHeight: 120, background: "#0c0c12", border: "1px solid #1c1c28",
                borderRadius: 12, padding: "14px", color: "#e4e4ed", fontSize: 14, outline: "none",
                resize: "none", marginBottom: 24, transition: "border-color 200ms ease",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"}
              onBlur={e => e.currentTarget.style.borderColor = "#1c1c28"}
            />

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  flex: 1, padding: "12px", borderRadius: 10, background: "transparent",
                  border: "1px solid #1c1c28", color: "#8b8b9e", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", transition: "all 150ms ease",
                }}
              >
                Cancel
              </button>
              <button
                disabled={loading || !prompt.trim()}
                onClick={handleGenerate}
                style={{
                  flex: 2, padding: "12px", borderRadius: 10,
                  background: loading || !prompt.trim() ? "#16161f" : "#8b5cf6",
                  border: "none", color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: loading || !prompt.trim() ? "none" : "0 8px 20px rgba(139,92,246,0.3)",
                  transition: "all 200ms ease",
                }}
              >
                {loading ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" /> : <Sparkles style={{ width: 16, height: 16 }} />}
                {loading ? "Generating..." : "Generate Workflow"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
