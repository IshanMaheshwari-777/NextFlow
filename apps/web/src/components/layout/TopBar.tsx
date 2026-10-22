"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Play, Download, Upload, Loader2, ChevronDown, Undo2, Redo2, Sparkles, History, ArrowLeft, Network, MoreHorizontal, Keyboard, Check, CloudOff, MousePointerClick } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useShallow } from "zustand/react/shallow";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { toast } from "@/components/ui/toast";
import type { RunMode, RunProgress } from "@/lib/useWorkflowRunner";

type Props = {
  allWorkflows: { id: string; name: string; updatedAt: string | Date }[];
  progress: RunProgress;
  onRun: (mode: RunMode) => void;
  onHistoryOpen: () => void;
  onGenerateOpen: () => void;
  onSaveNow: () => void;
};

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOutside(); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onOutside(); };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [ref, onOutside, active]);
}

export default function TopBar({ allWorkflows, progress, onRun, onHistoryOpen, onGenerateOpen, onSaveNow }: Props) {
  const { workflowId, workflowName, nodeCount, selectedCount, isRunning, canUndo, canRedo, saveState, runCount, setWorkflowName, undo, redo } = useWorkflowStore(useShallow(s => ({
    workflowId: s.workflowId, workflowName: s.workflowName, nodeCount: s.nodes.length, selectedCount: s.nodes.filter(n => n.selected).length,
    isRunning: s.isRunning, canUndo: s.past.length > 0, canRedo: s.future.length > 0, saveState: s.saveState, runCount: s.runHistory.length,
    setWorkflowName: s.setWorkflowName, undo: s.undo, redo: s.redo,
  })));
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(workflowName);
  const [menu, setMenu] = useState<"none" | "more" | "run" | "switch">("none");
  const fileRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<HTMLDivElement>(null);
  const switchRef = useRef<HTMLDivElement>(null);
  const closeMenu = () => setMenu("none");
  useClickOutside(moreRef, closeMenu, menu === "more");
  useClickOutside(runRef, closeMenu, menu === "run");
  useClickOutside(switchRef, closeMenu, menu === "switch");

  const commitName = () => { setEditing(false); if (nameDraft.trim() && nameDraft.trim() !== workflowName) setWorkflowName(nameDraft); else setNameDraft(workflowName); };

  const handleExport = () => {
    const json = useWorkflowStore.getState().exportAsJSON();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    a.download = `${workflowName.replace(/[^\w\- ]+/g, "").trim() || "workflow"}.json`;
    a.click();
    toast.success("Workflow exported.");
  };

  const handleImport = (file: File) => {
    const r = new FileReader();
    r.onload = ev => {
      try {
        const n = useWorkflowStore.getState().importFromJSON(String(ev.target?.result ?? ""));
        toast.success(`Imported ${n} node${n === 1 ? "" : "s"}. Press ⌘Z to undo.`);
        window.dispatchEvent(new Event("canvas-fit-view"));
      } catch (e) { toast.error(e instanceof Error ? e.message : "Import failed."); }
    };
    r.readAsText(file);
  };

  // The main button always means "run everything" — selection-only runs live in the dropdown,
  // so adding (and auto-selecting) a node never silently changes what Run does.
  const runLabel = isRunning
    ? progress ? `Running ${Math.min(progress.done + 1, progress.total)}/${progress.total}` : "Starting…"
    : "Run";

  return (
    <header className="topbar">
      {/* LEFT */}
      <div className="topbar-left">
        <Link href="/dashboard" className="icon-btn" title="Back to dashboard" aria-label="Back to dashboard"><ArrowLeft size={16} /></Link>
        <div className="brand-mark" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></div>

        <div ref={switchRef} style={{ position: "relative", display: "flex", alignItems: "center", minWidth: 0 }}>
          {editing ? (
            <input
              autoFocus
              onFocus={e => e.currentTarget.select()}
              className="name-input"
              value={nameDraft}
              maxLength={200}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNameDraft(workflowName); setEditing(false); } }}
              aria-label="Workflow name"
            />
          ) : (
            <button className="name-btn" title="Click to rename" onClick={() => { setNameDraft(workflowName); setEditing(true); }}>{workflowName}</button>
          )}
          <button className="icon-btn icon-btn-sm" aria-label="Switch workflow" title="Switch workflow" onClick={() => setMenu(menu === "switch" ? "none" : "switch")}><ChevronDown size={14} /></button>
          {menu === "switch" && (
            <div className="menu" style={{ position: "absolute", top: 38, left: 0, width: 260 }} role="menu">
              <p className="menu-heading">Your workflows</p>
              {allWorkflows.slice(0, 8).map(wf => (
                <button key={wf.id} role="menuitem" className={`menu-item ${wf.id === workflowId ? "is-current" : ""}`} onClick={() => { closeMenu(); if (wf.id !== workflowId) router.push(`/workflow/${wf.id}`); }}>
                  <Network size={13} /> <span className="truncate" style={{ flex: 1 }}>{wf.id === workflowId ? workflowName : wf.name}</span>
                  {wf.id === workflowId && <Check size={13} />}
                </button>
              ))}
              <div className="menu-sep" />
              <Link href="/dashboard" className="menu-item" onClick={closeMenu}><ArrowLeft size={13} /> All workflows</Link>
            </div>
          )}
        </div>

        <SaveIndicator state={saveState} onRetry={onSaveNow} />
      </div>

      {/* RIGHT */}
      <div className="topbar-right">
        <button className="btn btn-secondary btn-sm hide-sm" onClick={onGenerateOpen}><Sparkles size={13} /> AI Generate</button>
        <div className="topbar-sep hide-sm" />
        <button onClick={undo} disabled={!canUndo} className="icon-btn" title="Undo (⌘Z)" aria-label="Undo"><Undo2 size={15} /></button>
        <button onClick={redo} disabled={!canRedo} className="icon-btn" title="Redo (⌘⇧Z)" aria-label="Redo"><Redo2 size={15} /></button>
        <button onClick={onHistoryOpen} className="icon-btn" title="Run history" aria-label="Run history" style={{ position: "relative" }}>
          <History size={15} />
          {runCount > 0 && <span className="badge-dot">{runCount > 99 ? "99+" : runCount}</span>}
        </button>
        <ThemeToggle />
        <div ref={moreRef} style={{ position: "relative" }}>
          <button className="icon-btn" aria-label="More options" title="More" onClick={() => setMenu(menu === "more" ? "none" : "more")}><MoreHorizontal size={16} /></button>
          {menu === "more" && (
            <div className="menu" style={{ position: "absolute", top: 38, right: 0, width: 220 }} role="menu">
              <button role="menuitem" className="menu-item show-sm" onClick={() => { closeMenu(); onGenerateOpen(); }}><Sparkles size={13} /> AI Generate</button>
              <button role="menuitem" className="menu-item" onClick={() => { closeMenu(); handleExport(); }}><Download size={13} /> Export as JSON</button>
              <button role="menuitem" className="menu-item" onClick={() => { closeMenu(); fileRef.current?.click(); }}><Upload size={13} /> Import JSON…</button>
              <div className="menu-sep" />
              <button role="menuitem" className="menu-item" onClick={() => { closeMenu(); window.dispatchEvent(new Event("open-shortcuts")); }}><Keyboard size={13} /> Keyboard shortcuts</button>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }} />

        {/* Run split button */}
        <div ref={runRef} className="split-btn">
          <button className="btn btn-primary btn-sm split-main" onClick={() => onRun("full")} disabled={isRunning || nodeCount === 0}
            title="Run the whole workflow (⌘Enter)">
            {isRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
            {runLabel}
          </button>
          <button className="btn btn-primary btn-sm split-caret" aria-label="Run options" disabled={isRunning || nodeCount === 0} onClick={() => setMenu(menu === "run" ? "none" : "run")}><ChevronDown size={13} /></button>
          {menu === "run" && (
            <div className="menu" style={{ position: "absolute", top: 38, right: 0, width: 230 }} role="menu">
              <button role="menuitem" className="menu-item" onClick={() => { closeMenu(); onRun("full"); }}><Play size={13} /> <span style={{ flex: 1 }}>Run full workflow</span><kbd className="menu-kbd">⌘↵</kbd></button>
              <button role="menuitem" className="menu-item" disabled={selectedCount === 0} onClick={() => { closeMenu(); onRun("selected"); }}><MousePointerClick size={13} /> <span style={{ flex: 1 }}>Run selected ({selectedCount})</span></button>
            </div>
          )}
        </div>

        <div style={{ marginLeft: 4, display: "flex" }}><UserButton appearance={{ elements: { userButtonAvatarBox: { width: 28, height: 28 } } }} /></div>
      </div>
      {isRunning && progress && <div className="run-progress" style={{ width: `${Math.max(4, (progress.done / Math.max(1, progress.total)) * 100)}%` }} />}
    </header>
  );
}

function SaveIndicator({ state, onRetry }: { state: string; onRetry: () => void }) {
  if (state === "saving") return <span className="save-indicator"><Loader2 size={12} className="animate-spin" /> Saving…</span>;
  if (state === "saved") return <span className="save-indicator"><Check size={12} /> Saved</span>;
  if (state === "error") return <button className="save-indicator is-error" onClick={onRetry} title="Retry saving"><CloudOff size={12} /> Not saved · Retry</button>;
  return null;
}
