"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useRouter } from "next/navigation";
import { Play, Download, Upload, Loader2, ChevronDown, Undo2, Redo2, AlertTriangle, XCircle, Sparkles, Clock, Sun, Moon, ArrowLeft, Network } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { NODE_HANDLES, NodeType, HANDLE_COMPAT } from "@/types";

type Props = { allWorkflows: { id: string; name: string; updatedAt: Date }[]; onHistoryOpen: () => void };



function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => { setIsDark(!document.documentElement.classList.contains("light")); }, []);
  const toggle = () => {
    const next = isDark ? "light" : "dark";
    document.documentElement.classList.toggle("light", next === "light");
    localStorage.setItem("theme", next);
    setIsDark(!isDark);
  };
  return (
    <button onClick={toggle} className="ghost-btn" title="Toggle theme">
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

export default function TopBar({ allWorkflows, onHistoryOpen }: Props) {
  const {
    workflowId, workflowName, nodes, edges, isRunning, past, future, cooldownEnd,
    setWorkflowName, setNodes, setEdges, saveSnapshot, exportAsJSON, importFromJSON,
    resetNodeStates, setIsRunning, setNodeResult, setIsRightOpen, updateNodeData, undo, redo
  } = useWorkflowStore();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRunMenu, setShowRunMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(workflowName);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const runMenuRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<{ message: string; type: "error" | "warning" } | null>(null);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);
  const showToast = useCallback((message: string, type: "error" | "warning") => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
      if (runMenuRef.current && !runMenuRef.current.contains(e.target as Node)) setShowRunMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleRun("full"); }
    };
    const handleRunSingle = (e: Event) => {
      const ce = e as CustomEvent;
      handleRun("single", [ce.detail.nodeId]);
    };
    const handleCanvasRun = (e: Event) => {
      const ce = e as CustomEvent;
      const mode = ce.detail?.mode || "full";
      if (mode === "selected") {
        handleRun("selected");
      } else {
        handleRun("full");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("run-single-node", handleRunSingle);
    window.addEventListener("canvas-run-workflow", handleCanvasRun);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("run-single-node", handleRunSingle); window.removeEventListener("canvas-run-workflow", handleCanvasRun); };
  }, [isRunning, workflowId, nodes, edges]);

  useEffect(() => {
    let poll: NodeJS.Timeout;
    if (isRunning && workflowId) {
      poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/workflow/${workflowId}/runs`);
          if (res.ok) { const { runs } = await res.json(); useWorkflowStore.getState().setRunHistory(runs); }
        } catch {}
      }, 2000);
    }
    return () => { if (poll) clearInterval(poll); };
  }, [isRunning, workflowId]);

  const handleRun = async (mode: "full" | "selected" | "single" = "full", overrideNodeIds?: string[]) => {
    if (isRunning || !workflowId || nodes.length === 0) return;
    setShowRunMenu(false);
    let selectedNodeIds = overrideNodeIds || [];
    if (mode === "selected") {
      selectedNodeIds = nodes.filter((n: any) => n.selected).map(n => n.id);
      if (selectedNodeIds.length === 0) return;
    }
    const targetedImageNodes = nodes.filter(n => n.type === "generate-image" && (mode === "full" || selectedNodeIds.includes(n.id)));
    if (targetedImageNodes.length > 0 && cooldownEnd > Date.now()) {
      const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
      const m = Math.floor(remaining / 60), s = remaining % 60;
      showToast(`Image generation cooldown active. Please wait ${m}:${s.toString().padStart(2, "0")}.`, "warning");
      return;
    }
    resetNodeStates(); setIsRunning(true); setIsRightOpen(true);
    const runStart = performance.now();
    try {
      const cleanNodes = nodes.map(n => ({ ...n, data: { ...n.data, fileData: undefined, previewUrl: undefined } }));
      const res = await fetch(`/api/workflow/${workflowId}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nodes: cleanNodes, edges, runMode: mode, selectedNodeIds }) });
      if (!res.ok) { const t = await res.text().catch(() => "Unknown error"); throw new Error(`Workflow run failed (${res.status})`); }
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n"); buffer = parts.pop() || "";
          for (const part of parts) {
            if (!part.trim()) continue;
            const lines = part.split("\n"); let eventType = "", dataStr = "";
            for (const line of lines) { if (line.startsWith("event: ")) eventType = line.slice(7); if (line.startsWith("data: ")) dataStr += line.slice(6); }
            if (!eventType || !dataStr) continue;
            try {
              const data = JSON.parse(dataStr); const store = useWorkflowStore.getState();
              if (eventType === "node-start") store.updateNodeData(data.nodeId, { isRunning: true, runStatus: "running", runError: undefined, runOutput: undefined });
              else if (eventType === "node-complete") store.setNodeResult(data.nodeId, data.status, data.output, data.error);
              else if (eventType === "workflow-complete") { if (data.status === "failed") showToast("Workflow run failed. Check node errors for details.", "error"); else if (data.status === "partial") showToast("Some nodes failed during the workflow run.", "warning"); }
              else if (eventType === "error") showToast(data.error || "Workflow run failed.", "error");
            } catch {}
          }
        }
      } else {
        const data = await res.json();
        if (data.nodeResults) for (const [nid, result] of Object.entries(data.nodeResults as Record<string, any>)) setNodeResult(nid, result.status, result.output, result.error);
        if (data.status === "failed") showToast("Workflow run failed.", "error");
      }
      const runsRes = await fetch(`/api/workflow/${workflowId}/runs`);
      if (runsRes.ok) { const { runs } = await runsRes.json(); useWorkflowStore.getState().setRunHistory(runs); }
    } catch (e: any) {
      showToast("Workflow run failed. Check node errors for details.", "error");
      const store = useWorkflowStore.getState();
      for (const node of store.nodes) { if ((node.data as any).isRunning) store.setNodeResult(node.id, "failed", undefined, e?.message); }
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

  const sep = <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />;

  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 12px", width: "100%", height: 48,
        background: "var(--topbar)", borderBottom: "1px solid var(--topbar-border)",
        userSelect: "none", flexShrink: 0,
      }}>
        {/* LEFT: Logo + Workflow name dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: showDropdown ? "var(--nav-hover)" : "transparent", border: "none", cursor: "pointer", transition: "background 100ms" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--nav-hover)")}
              onMouseLeave={e => { if (!showDropdown) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--text)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              {editingName ? (
                <input
                  autoFocus
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { setWorkflowName(nameVal); setEditingName(false); } if (e.key === "Escape") setEditingName(false); }}
                  onBlur={() => { setWorkflowName(nameVal); setEditingName(false); }}
                  onClick={e => e.stopPropagation()}
                  style={{ background: "transparent", border: "none", outline: "none", fontSize: 14, fontWeight: 500, color: "var(--text)", width: 160 }}
                />
              ) : (
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workflowName}</span>
              )}
              <ChevronDown size={13} color="var(--text-muted)" />
            </button>

            {showDropdown && (
              <div style={{ position: "absolute", top: 44, left: 0, zIndex: 300, width: 220, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.4)", overflow: "hidden", animation: "fadeIn 0.12s ease" }}>
                {[
                  { icon: <ArrowLeft size={13} />, label: "Back to Dashboard", action: () => { router.push("/dashboard"); setShowDropdown(false); } },
                  { icon: <Download size={13} />, label: "Export JSON", action: () => { handleExport(); setShowDropdown(false); } },
                  { icon: <Upload size={13} />, label: "Import JSON", action: () => { fileRef.current?.click(); setShowDropdown(false); } },
                ].map(item => (
                  <button key={item.label} onClick={item.action} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--nav-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
                {allWorkflows.length > 0 && (
                  <>
                    <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", padding: "4px 14px 2px", margin: 0 }}>Workspaces</p>
                    {allWorkflows.slice(0, 6).map(wf => (
                      <button key={wf.id} onClick={() => { router.push(`/workflow/${wf.id}`); setShowDropdown(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "none", border: "none", cursor: "pointer", color: wf.id === workflowId ? "var(--text)" : "var(--text-secondary)", fontSize: 12, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--nav-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        <Network size={12} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wf.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* AI Generate */}
          <AIWorkflowGenerator />
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => importFromJSON(ev.target?.result as string); r.readAsText(f); }} />

          <ThemeToggle />
          <button onClick={onHistoryOpen} className="ghost-btn" title="Run history"><Clock size={15} /></button>
          <button onClick={undo} disabled={past.length === 0} className="ghost-btn" title="Undo (⌘Z)"><Undo2 size={15} /></button>
          <button onClick={redo} disabled={future.length === 0} className="ghost-btn" title="Redo (⌘⇧Z)"><Undo2 size={15} style={{ transform: "scaleX(-1)" }} /></button>

          {sep}

          {/* Run button */}
          <div ref={runMenuRef} style={{ display: "flex", alignItems: "center", position: "relative" }}>
            <button
              onClick={() => handleRun("full")}
              disabled={isRunning || nodes.length === 0}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "0 14px",
                height: 32, fontSize: 13, fontWeight: 600, color: "var(--bg)",
                background: isRunning ? "var(--border)" : "var(--text)",
                border: "none", borderRadius: "8px 0 0 8px",
                cursor: isRunning || nodes.length === 0 ? "not-allowed" : "pointer",
                opacity: nodes.length === 0 ? 0.5 : 1, transition: "all 150ms",
              }}
            >
              {isRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} fill="#fff" />}
              {isRunning ? "Running..." : "Run"}
            </button>
            <button
              onClick={() => setShowRunMenu(!showRunMenu)}
              disabled={isRunning || nodes.length === 0}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 24, height: 32, color: "var(--bg)",
                background: isRunning ? "var(--border)" : "var(--text)",
                border: "none", borderLeft: "1px solid var(--border)", borderRadius: "0 8px 8px 0",
                cursor: isRunning || nodes.length === 0 ? "not-allowed" : "pointer", opacity: nodes.length === 0 ? 0.5 : 1,
              }}
            >
              <ChevronDown size={12} />
            </button>
            {showRunMenu && (
              <div style={{ position: "absolute", top: 36, right: 0, zIndex: 300, width: 200, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", padding: 4, animation: "fadeIn 0.1s ease" }}>
                {[
                  { label: "▶  Run Full Workflow", sub: "⌘↵", action: () => handleRun("full") },
                  { label: "▶  Run Selected Nodes", sub: "", action: () => handleRun("selected"), disabled: nodes.filter((n: any) => n.selected).length === 0 },
                ].map(item => (
                  <button key={item.label} onClick={item.action} disabled={item.disabled} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "none", border: "none", borderRadius: 6, cursor: item.disabled ? "not-allowed" : "pointer", color: item.disabled ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 12 }}
                    onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = "var(--nav-hover)"; }}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <span>{item.label}</span>
                    {item.sub && <span style={{ fontSize: 10, opacity: 0.4 }}>{item.sub}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginLeft: 6 }}>
            <UserButton appearance={{ baseTheme: dark, elements: { userButtonAvatarBox: "w-8 h-8" } }} />
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 12, background: toast.type === "error" ? "rgba(248,113,113,0.1)" : "rgba(251,191,36,0.1)", border: `1px solid ${toast.type === "error" ? "rgba(248,113,113,0.3)" : "rgba(251,191,36,0.3)"}`, backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", animation: "slideUp 0.2s ease" }}>
          {toast.type === "error" ? <XCircle size={16} style={{ color: "#f87171", flexShrink: 0 }} /> : <AlertTriangle size={16} style={{ color: "#fbbf24", flexShrink: 0 }} />}
          <span style={{ fontSize: 13, color: toast.type === "error" ? "#f87171" : "#fbbf24", fontWeight: 500 }}>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", marginLeft: 4, display: "flex" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
    </>
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
      const res = await fetch("/api/workflow/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      if (res.ok) {
        const data = await res.json();
        if (data.nodes && data.edges) {
          saveSnapshot();
          const idMap = new Map<string, string>();

          // Utility: get default data for a node type
          const getDefaults = (type: string): Record<string, any> => {
            switch (type) {
              case "text": return { label: "Text Node", text: "" };
              case "upload-image": return { label: "Upload Image" };
              case "upload-video": return { label: "Upload Video" };
              case "llm": return { label: "LLM Node", model: "llama-3.1-8b-instant", system_prompt: "", user_message: "" };
              case "crop-image": return { label: "Crop Image", x_percent: 0, y_percent: 0, width_percent: 100, height_percent: 100 };
              case "extract-frame": return { label: "Extract Frame", timestamp: 0 };
              case "generate-image": return { label: "Generate Image", prompt: "", model: "flux", width: 768, height: 768, seed: Math.floor(Math.random() * 1000000) };
              case "prompt-enhancer": return { label: "Enhance Prompt", prompt: "", style: "realistic" };
              case "video-enhance": return { label: "Video Enhance", video_url: "", resolution: "1080p", strength: "medium" };
              default: return { label: "Node" };
            }
          };

          // Handle ID correction map for common LLM mistakes
          const HANDLE_ALIASES: Record<string, string> = {
            "image_url": "imageUrl", "image": "imageUrl", "input_image": "imageUrl",
            "video": "video_url", "input_video": "video_url",
            "input": "prompt", "text": "prompt", "input_text": "user_message",
            "message": "user_message", "system": "system_prompt",
            "out": "output", "result": "output",
          };

          // Step 1: Remap node IDs and merge with defaults
          const validTypes = new Set(["text", "upload-image", "upload-video", "llm", "crop-image", "extract-frame", "generate-image", "prompt-enhancer", "video-enhance"]);
          const mappedNodes = data.nodes
            .filter((n: any) => validTypes.has(n.type))
            .map((n: any) => {
              const newId = `${n.type}-${Math.random().toString(36).substr(2, 9)}`;
              idMap.set(n.id, newId);
              const defaults = getDefaults(n.type);
              return {
                ...n,
                id: newId,
                data: {
                  ...defaults,
                  ...n.data,
                  label: n.data?.label || defaults.label,
                  runStatus: "idle",
                  connectedInputs: [],
                },
              };
            });

          // Step 2: Build a set of valid node IDs for edge validation
          const validNodeIds = new Set(mappedNodes.map((n: any) => n.id));

          // Step 3: Validate/correct edges and add visual properties
          const handleColors: Record<string, string> = { text: "#6366f1", image: "#10b981", video: "#f59e0b", any: "#94a3b8" };
          const mappedEdges = data.edges
            .map((e: any) => {
              const newSource = idMap.get(e.source) || e.source;
              const newTarget = idMap.get(e.target) || e.target;
              // Skip edges with unmapped nodes
              if (!validNodeIds.has(newSource) || !validNodeIds.has(newTarget)) return null;

              // Fix handle IDs using alias map
              let srcHandle = e.sourceHandle || "output";
              let tgtHandle = e.targetHandle || "output";
              srcHandle = HANDLE_ALIASES[srcHandle] || srcHandle;
              tgtHandle = HANDLE_ALIASES[tgtHandle] || tgtHandle;

              // Validate handles against NODE_HANDLES definitions
              const srcNode = mappedNodes.find((n: any) => n.id === newSource);
              const tgtNode = mappedNodes.find((n: any) => n.id === newTarget);
              if (!srcNode || !tgtNode) return null;
              const srcHandleDefs = NODE_HANDLES[srcNode.type as NodeType];
              const tgtHandleDefs = NODE_HANDLES[tgtNode.type as NodeType];
              if (!srcHandleDefs || !tgtHandleDefs) return null;

              // Auto-correct: if sourceHandle doesn't exist, default to "output"
              if (!srcHandleDefs.outputs.find((h: any) => h.id === srcHandle)) srcHandle = "output";
              // Auto-correct: if targetHandle doesn't exist, pick the first compatible input
              const tgtHandleDef = tgtHandleDefs.inputs.find((h: any) => h.id === tgtHandle);
              if (!tgtHandleDef && tgtHandleDefs.inputs.length > 0) {
                // Find the source output type
                const srcType = srcHandleDefs.outputs.find((h: any) => h.id === srcHandle)?.type || "any";
                // Pick first compatible input
                const compatible = tgtHandleDefs.inputs.find((h: any) => HANDLE_COMPAT[srcType as keyof typeof HANDLE_COMPAT]?.includes(h.type));
                tgtHandle = compatible?.id || tgtHandleDefs.inputs[0].id;
              }

              // Determine edge color from source output type
              const srcOutDef = srcHandleDefs.outputs.find((h: any) => h.id === srcHandle);
              const strokeColor = handleColors[srcOutDef?.type || "any"] || "#94a3b8";

              return {
                id: `e-${newSource}-${srcHandle}-${newTarget}-${tgtHandle}`,
                source: newSource,
                sourceHandle: srcHandle,
                target: newTarget,
                targetHandle: tgtHandle,
                animated: true,
                style: { stroke: strokeColor, strokeWidth: 2 },
              };
            })
            .filter(Boolean);

          // Step 4: Populate connectedInputs on target nodes
          for (const edge of mappedEdges) {
            const targetNode = mappedNodes.find((n: any) => n.id === edge.target);
            if (targetNode && !targetNode.data.connectedInputs.includes(edge.targetHandle)) {
              targetNode.data.connectedInputs.push(edge.targetHandle);
            }
          }

          setNodes([...nodes, ...mappedNodes]);
          setEdges([...edges, ...mappedEdges]);
          setOpen(false); setPrompt("");
        }
      }
    } catch (e) { console.error("AI Generation failed:", e); } finally { setLoading(false); }
  };
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hover)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; }}
      >
        <Sparkles size={12} /> AI Generate
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }} onClick={() => setOpen(false)}>
          <div style={{ width: "min(480px,90vw)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.5)", animation: "slideUp 0.25s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={16} color="var(--bg)" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Generate Workflow</h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>Describe the workflow you want to build. AI will generate the nodes and connections.</p>
            <textarea autoFocus placeholder="e.g. Build AI workflow with prompt enhancement, LLM processing, and image generation..." value={prompt} onChange={e => setPrompt(e.target.value)} style={{ width: "100%", minHeight: 110, background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, color: "var(--text)", fontSize: 13, outline: "none", resize: "none", marginBottom: 20, fontFamily: "inherit", lineHeight: 1.5 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setOpen(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button disabled={loading || !prompt.trim()} onClick={handleGenerate} style={{ flex: 2, padding: 10, borderRadius: 8, background: loading || !prompt.trim() ? "var(--surface-hover)" : "var(--text)", border: "none", color: "var(--bg)", fontSize: 13, fontWeight: 700, cursor: loading || !prompt.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={14} />}
                {loading ? "Generating..." : "Generate Workflow"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
