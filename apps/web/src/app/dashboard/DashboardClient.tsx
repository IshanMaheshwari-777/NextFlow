"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Plus, Search, MoreHorizontal, Pencil, Copy, Trash2, Loader2, ArrowRight, Play, Image as ImageIcon, Clapperboard, Sparkles } from "lucide-react";
import { NODE_COLORS, NodeType, SIDEBAR_NODES } from "@nextflow/shared/types";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Modal } from "@/components/ui/Modal";
import { Toaster, toast } from "@/components/ui/toast";
import { formatDuration, formatRelative } from "@/lib/utils";

type Workflow = { id: string; name: string; updatedAt: string; runCount: number; nodeTypes: string[] };
type Run = { id: string; status: string; createdAt: string; duration: number | null; runMode: string; workflowId: string; workflow: { name: string } };

const TEMPLATE_CARDS = [
  { id: "prompt-to-image", name: "Idea → Image", description: "Turn a one-line idea into a detailed prompt and a generated image. No uploads needed.", types: ["text", "prompt-enhancer", "generate-image"], icon: Sparkles, badge: "Fastest start" },
  { id: "marketing-kit", name: "Product Marketing Kit", description: "Crop a product photo, grab a frame from a demo video, and write launch copy with vision AI.", types: ["upload-image", "crop-image", "llm", "upload-video", "extract-frame", "llm"], icon: ImageIcon, badge: "Image + video" },
] as const;

const LABEL_BY_TYPE = Object.fromEntries(SIDEBAR_NODES.map(n => [n.type, n.label]));

function NodeStrip({ types }: { types: readonly string[] }) {
  const shown = types.slice(0, 5);
  if (shown.length === 0) return <span className="wf-empty-preview">Empty canvas</span>;
  return (
    <div className="wf-strip">
      {shown.map((t, i) => (
        <span key={i} style={{ display: "contents" }}>
          <span className="wf-chip" title={LABEL_BY_TYPE[t] ?? t} style={{ ["--c" as string]: NODE_COLORS[t as NodeType] ?? "#71717a" }} />
          {i < shown.length - 1 && <span className="wf-wire" />}
        </span>
      ))}
      {types.length > 5 && <span className="wf-more">+{types.length - 5}</span>}
    </div>
  );
}

export default function DashboardClient({ workflows, recentRuns, userName }: { workflows: Workflow[]; recentRuns: Run[]; userName: string | null }) {
  const router = useRouter();
  const [wfs, setWfs] = useState(workflows);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<Workflow | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleting, setDeleting] = useState<Workflow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? wfs.filter(w => w.name.toLowerCase().includes(q)) : wfs;
  }, [wfs, query]);

  const create = async (body: Record<string, unknown>, key: string) => {
    if (busy) return;
    setBusy(key);
    try {
      const res = await fetch("/api/workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) throw new Error(data.error || `Couldn't create the workflow (${res.status})`);
      router.push(`/workflow/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the workflow.");
      setBusy(null);
    }
  };

  const duplicate = async (wf: Workflow) => {
    setMenuFor(null);
    try {
      const res = await fetch("/api/workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duplicateOf: wf.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWfs(prev => [{ id: data.id, name: data.name, updatedAt: data.updatedAt, runCount: 0, nodeTypes: wf.nodeTypes }, ...prev]);
      toast.success(`Duplicated “${wf.name}”.`);
    } catch { toast.error("Couldn't duplicate that workflow."); }
  };

  const rename = async () => {
    if (!renaming) return;
    const name = renameDraft.trim();
    if (!name || name === renaming.name) { setRenaming(null); return; }
    const prev = wfs;
    setWfs(w => w.map(x => x.id === renaming.id ? { ...x, name } : x));
    setRenaming(null);
    const res = await fetch(`/api/workflow/${renaming.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }).catch(() => null);
    if (!res?.ok) { setWfs(prev); toast.error("Couldn't rename the workflow."); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setBusy("delete");
    const res = await fetch(`/api/workflow/${target.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    if (!res?.ok) { toast.error("Couldn't delete the workflow. Please try again."); return; }
    setWfs(w => w.filter(x => x.id !== target.id));
    setDeleting(null);
    toast.success(`Deleted “${target.name}”.`);
  };

  return (
    <div className="dash">
      <header className="dash-header">
        <Link href="/dashboard" className="dash-brand">
          <span className="brand-mark" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></span>
          NextFlow
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ThemeToggle />
          <UserButton appearance={{ elements: { userButtonAvatarBox: { width: 30, height: 30 } } }} />
        </div>
      </header>

      <main className="dash-main">
        <section className="dash-hero">
          <div>
            <h1>{userName ? `Welcome back, ${userName}` : "Your workflows"}</h1>
            <p>Chain LLMs, image generation and video tools into pipelines you can run with one click.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-lg" onClick={() => create({ name: "New Workflow" }, "blank")} disabled={!!busy}>
              {busy === "blank" ? <Loader2 size={15} className="animate-spin" /> : <Plus size={16} />} New workflow
            </button>
          </div>
        </section>

        <section className="dash-section">
          <div className="dash-section-head"><h2>Start from a template</h2></div>
          <div className="tpl-grid">
            {TEMPLATE_CARDS.map(t => (
              <button key={t.id} className="tpl-card" onClick={() => create({ template: t.id }, t.id)} disabled={!!busy}>
                <div className="tpl-top">
                  <span className="tpl-icon"><t.icon size={16} /></span>
                  <span className="tpl-badge">{t.badge}</span>
                </div>
                <span className="tpl-name">{t.name}</span>
                <span className="tpl-desc">{t.description}</span>
                <div className="tpl-foot">
                  <NodeStrip types={t.types} />
                  <span className="tpl-cta">{busy === t.id ? <Loader2 size={13} className="animate-spin" /> : <>Use template <ArrowRight size={13} /></>}</span>
                </div>
              </button>
            ))}
            <button className="tpl-card tpl-card-blank" onClick={() => create({ name: "New Workflow" }, "blank2")} disabled={!!busy}>
              <span className="tpl-icon"><Clapperboard size={16} /></span>
              <span className="tpl-name">Blank canvas</span>
              <span className="tpl-desc">Start empty and add nodes yourself — or describe your workflow and let AI build it.</span>
              <span className="tpl-cta" style={{ marginTop: "auto" }}>{busy === "blank2" ? <Loader2 size={13} className="animate-spin" /> : <>Create <ArrowRight size={13} /></>}</span>
            </button>
          </div>
        </section>

        <div className="dash-columns">
          <section className="dash-section" style={{ minWidth: 0 }}>
            <div className="dash-section-head">
              <h2>Workflows <span className="count-pill">{wfs.length}</span></h2>
              <label className="search-box">
                <Search size={14} />
                <input placeholder="Search workflows" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search workflows" />
              </label>
            </div>
            {filtered.length === 0 ? (
              <div className="empty-state" style={{ border: "1px dashed var(--border)", borderRadius: 12 }}>
                <p className="empty-state-title">{query ? `No workflows match “${query}”` : "No workflows yet"}</p>
                <p className="empty-state-sub">{query ? "Try a different name." : "Create one above, or start from a template."}</p>
              </div>
            ) : (
              <div className="wf-grid">
                {filtered.map(wf => (
                  <div key={wf.id} className="wf-card">
                    <Link href={`/workflow/${wf.id}`} className="wf-card-link" aria-label={`Open ${wf.name}`}>
                      <div className="wf-preview"><NodeStrip types={wf.nodeTypes} /></div>
                      <div className="wf-body">
                        <span className="wf-name">{wf.name}</span>
                        <span className="wf-meta" suppressHydrationWarning>
                          {wf.nodeTypes.length} node{wf.nodeTypes.length === 1 ? "" : "s"} · {wf.runCount} run{wf.runCount === 1 ? "" : "s"} · edited {formatRelative(wf.updatedAt)}
                        </span>
                      </div>
                    </Link>
                    <CardMenu
                      open={menuFor === wf.id}
                      onToggle={() => setMenuFor(menuFor === wf.id ? null : wf.id)}
                      onClose={() => setMenuFor(null)}
                      onRename={() => { setMenuFor(null); setRenameDraft(wf.name); setRenaming(wf); }}
                      onDuplicate={() => duplicate(wf)}
                      onDelete={() => { setMenuFor(null); setDeleting(wf); }}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="dash-section dash-runs">
            <div className="dash-section-head"><h2>Recent runs</h2></div>
            {recentRuns.length === 0 ? (
              <p className="empty-state-sub" style={{ padding: "8px 2px" }}>Runs show up here. Open a workflow and press <kbd>⌘ Enter</kbd>.</p>
            ) : (
              <div className="runs-list">
                {recentRuns.map(r => (
                  <Link key={r.id} href={`/workflow/${r.workflowId}`} className="runs-item">
                    <span className={`timeline-dot status-${r.status}`} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="runs-name truncate">{r.workflow.name}</span>
                      <span className="runs-meta" suppressHydrationWarning>{formatRelative(r.createdAt)} · {r.runMode === "full" ? "full run" : r.runMode}</span>
                    </span>
                    <span className="timeline-time">{r.status === "running" ? <Play size={11} /> : formatDuration(r.duration)}</span>
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename workflow" width={420}>
        <div className="modal-body">
          <input data-autofocus onFocus={e => e.currentTarget.select()} className="text-input" value={renameDraft} maxLength={200} onChange={e => setRenameDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") rename(); }} />
        </div>
        <div className="modal-footer" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={() => setRenaming(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={rename} disabled={!renameDraft.trim()}>Save</button>
        </div>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title={`Delete “${deleting?.name ?? ""}”?`} subtitle="This permanently removes the workflow and its run history. This can't be undone." width={440}>
        <div className="modal-footer" style={{ justifyContent: "flex-end", borderTop: "none" }}>
          <button className="btn btn-secondary" onClick={() => setDeleting(null)} data-autofocus>Cancel</button>
          <button className="btn btn-danger" onClick={confirmDelete} disabled={busy === "delete"}>
            {busy === "delete" && <Loader2 size={14} className="animate-spin" />} Delete workflow
          </button>
        </div>
      </Modal>
      <Toaster />
    </div>
  );
}

function CardMenu({ open, onToggle, onClose, onRename, onDuplicate, onDelete }: { open: boolean; onToggle: () => void; onClose: () => void; onRename: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  return (
    <div ref={ref} className="wf-menu">
      <button className="icon-btn icon-btn-sm" aria-label="Workflow options" onClick={onToggle}><MoreHorizontal size={15} /></button>
      {open && (
        <div className="menu" style={{ position: "absolute", top: 30, right: 0, width: 170 }} role="menu">
          <button role="menuitem" className="menu-item" onClick={onRename}><Pencil size={13} /> Rename</button>
          <button role="menuitem" className="menu-item" onClick={onDuplicate}><Copy size={13} /> Duplicate</button>
          <div className="menu-sep" />
          <button role="menuitem" className="menu-item menu-item-danger" onClick={onDelete}><Trash2 size={13} /> Delete</button>
        </div>
      )}
    </div>
  );
}
