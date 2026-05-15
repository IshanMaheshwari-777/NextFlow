"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { Plus, ChevronLeft, ChevronRight, Home, Network, Image as ImageIcon, Video, MoreHorizontal, Trash2, LogOut, Settings, Zap } from "lucide-react";
import * as Icons from "lucide-react";
import { SIDEBAR_NODES } from "@/types";
import { SAMPLE_NODES, SAMPLE_EDGES } from "@/lib/sampleWorkflow";

type Workflow = { id: string; name: string; updatedAt: string | Date; nodes?: any[] };

const NAV_ITEMS = [
  { icon: Home, label: "Home", href: "/dashboard", active: true },
];

const TABS = ["Projects", "Apps", "Examples", "Templates"];

function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    setIsDark(!document.documentElement.classList.contains("light"));
  }, []);
  const toggle = () => {
    const next = isDark ? "light" : "dark";
    document.documentElement.classList.toggle("light", next === "light");
    localStorage.setItem("theme", next);
    setIsDark(!isDark);
  };
  return (
    <button onClick={toggle} className="ghost-btn" title="Toggle theme" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", border: "none", cursor: "pointer", background: "transparent", color: "var(--text-secondary)" }}>
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      )}
    </button>
  );
}


function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const initials = user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0] || "U";
  const email = user?.emailAddresses[0]?.emailAddress || "";

  return (
    <div ref={ref} style={{ position: "relative", padding: collapsed ? "8px 0" : "8px 12px" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          background: open ? "var(--nav-hover)" : "transparent",
          border: "none", cursor: "pointer", borderRadius: 8,
          padding: collapsed ? "6px 0" : "6px 8px", justifyContent: collapsed ? "center" : "flex-start",
          transition: "background 100ms",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--nav-hover)")}
        onMouseLeave={e => (e.currentTarget.style.background = open ? "var(--nav-hover)" : "transparent")}
      >
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0,
          overflow: "hidden",
        }}>
          {user?.imageUrl ? <img src={user.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : initials.toUpperCase()}
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0, textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{user?.firstName || "User"}</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{email}</p>
          </div>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: collapsed ? 48 : 12,
          width: 200, background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", overflow: "hidden", zIndex: 200,
          animation: "fadeIn 0.12s ease",
        }}>
          <button onClick={() => { openUserProfile(); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13 }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--nav-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <Settings size={14} /> Manage Account
          </button>
          <div style={{ height: 1, background: "var(--border)" }} />
          <button onClick={() => signOut()} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: 13 }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

function NavSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <div style={{
      width: collapsed ? 52 : 220, flexShrink: 0, height: "100vh",
      background: "var(--sidebar)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      transition: "width 200ms cubic-bezier(0.4,0,0.2,1)", overflow: "hidden", position: "relative",
    }}>
      {/* Logo row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", padding: collapsed ? "14px 0" : "14px 12px", flexShrink: 0 }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#8b5cf6,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={13} fill="#fff" color="#fff" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>NextFlow</span>
          </div>
        )}
        <button onClick={onToggle} className="ghost-btn" title={collapsed ? "Expand" : "Collapse"}>
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Nav items */}
      <div style={{ padding: "0 6px", flex: 1 }}>
        {!collapsed && <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", padding: "8px 8px 4px", margin: 0 }}>Navigation</p>}
        {NAV_ITEMS.map(({ icon: Icon, label, href, active }) => (
          <Link key={label} href={href} style={{ textDecoration: "none" }}>
            <div title={collapsed ? label : undefined} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 8, marginBottom: 2,
              background: active ? "var(--nav-active)" : "transparent",
              color: active ? "var(--nav-text-active)" : "var(--nav-text-inactive)",
              cursor: "pointer", transition: "background 100ms", justifyContent: collapsed ? "center" : "flex-start",
            }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--nav-hover)"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>{label}</span>}
            </div>
          </Link>
        ))}
        
        {!collapsed && <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", padding: "12px 8px 4px", margin: 0 }}>Tools</p>}
        <div style={{ height: collapsed ? 12 : 0 }} />
        {SIDEBAR_NODES.map((node) => {
          const Icon = (Icons as any)[node.icon] as any;
          return (
            <div key={node.label} title={collapsed ? node.label : undefined} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 8, marginBottom: 2,
              color: "var(--nav-text-inactive)", cursor: "pointer", transition: "background 100ms",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--nav-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 5,
                background: `${node.color}15`, border: `1px solid ${node.color}25`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0
              }}>
                {Icon && <Icon style={{ width: 12, height: 12, color: node.color }} />}
              </div>
              {!collapsed && <span style={{ fontSize: 13 }}>{node.label}</span>}
            </div>
          );
        })}
      </div>

      {/* User pinned at bottom */}
      <UserMenu collapsed={collapsed} />
    </div>
  );
}

function WorkflowCard({ wf, onDelete }: { wf: Workflow; onDelete: (id: string) => void }) {
  const [hover, setHover] = useState(false);
  const nodeColors = ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899", "#f43f5e", "#3b82f6"];
  const nodes = wf.nodes || [];

  return (
    <Link href={`/workflow/${wf.id}`} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          height: 240, borderRadius: 12, border: `1px solid ${hover ? "var(--border)" : "var(--border)"}`,
          background: "var(--surface)", display: "flex", flexDirection: "column",
          cursor: "pointer", transition: "all 180ms ease", overflow: "hidden",
          boxShadow: hover ? "0 12px 40px rgba(0,0,0,0.15)" : "0 2px 8px rgba(0,0,0,0.2)",
          transform: hover ? "translateY(-2px)" : "none",
        }}
      >
        {/* Preview */}
        <div style={{
          height: 140, background: "var(--canvas-bg)", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundImage: "radial-gradient(circle, var(--border-subtle) 1px, transparent 1px)",
          backgroundSize: "16px 16px", position: "relative",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {(nodes.length > 0 ? nodes.slice(0, 4) : [1, 2, 3]).map((n: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: nodeColors[i % nodeColors.length] + "22", border: `1px solid ${nodeColors[i % nodeColors.length]}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: nodeColors[i % nodeColors.length] }} />
                </div>
                {i < 2 && <div style={{ width: 12, height: 1, background: "rgba(139,92,246,0.3)" }} />}
              </div>
            ))}
          </div>
          {hover && (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(wf.id); }}
              style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 6, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#f87171" }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
        {/* Body */}
        <div style={{ padding: "12px 14px", flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wf.name}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{nodes.length || 0} nodes</p>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-muted)" }} suppressHydrationWarning>Updated {new Date(wf.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardClient({ workflows, recentRuns = [] }: { workflows: Workflow[]; recentRuns?: any[] }) {
  const router = useRouter();
  const [wfs, setWfs] = useState(workflows);
  const [tab, setTab] = useState("Projects");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("sidebar-collapsed") === "true";
    return false;
  });

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New Workflow" }) });
      const data = await res.json();
      if (data.id) router.push(`/workflow/${data.id}`);
    } catch { setIsCreating(false); }
  };

  const handleLoadSample = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sample: true }) });
      const data = await res.json();
      if (data.id) router.push(`/workflow/${data.id}`);
    } catch { setIsCreating(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/workflow/${deleteId}`, { method: "DELETE" });
    setWfs(wfs.filter(w => w.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--bg)" }}>
      <NavSidebar collapsed={collapsed} onToggle={handleToggle} />

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {/* Topbar */}
        <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Projects Hub</span>
          <ThemeToggle />
        </div>

                                {/* Hero perfectly matching Krea layout */}
        <div style={{ position: "relative", height: 340, overflow: "hidden", margin: "0 0 0 0", flexShrink: 0, background: "#111111" }}>
          {/* Dynamic Light-to-Dark gradient bridge */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, var(--bg) 0%, var(--bg) 40%, transparent 80%)", zIndex: 0 }} />

          {/* Background grid */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(to right, var(--border-subtle) 1px, transparent 1px), linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px)", backgroundSize: "32px 32px", zIndex: 1 }} />
          
          {/* Floating background nodes mock (right side) */}
          <div style={{ position: "absolute", top: -40, right: -60, width: "60%", height: "140%", pointerEvents: "none", transform: "perspective(1000px) rotateY(-15deg) rotateX(5deg) scale(1.1)", zIndex: 2 }}>
            {/* Connection lines */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}>
              <path d="M 100 200 C 200 200, 150 400, 250 400" stroke="#3b82f6" strokeWidth="2" fill="none" />
              <path d="M 350 250 C 450 250, 400 350, 500 350" stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.5" />
            </svg>

            {/* Node 1 */}
            <div style={{ position: "absolute", top: 120, left: 220, width: 280, background: "#e5e5e5", borderRadius: 12, boxShadow: "0 24px 60px rgba(0,0,0,0.5)", overflow: "hidden", zIndex: 2, transform: "rotate(-4deg)" }}>
              <div style={{ height: 180, background: "#000" }}>
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%) contrast(120%)" }} alt="portrait" />
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><span style={{ fontSize: 10, color: "#666", fontWeight: 600 }}>Prompt</span><span style={{ fontSize: 10, color: "#666" }}>Image</span></div>
                <p style={{ fontSize: 12, color: "#333", lineHeight: 1.5, margin: 0 }}>Your task is to convert the user-provided selfie and turn it into a dramatic and extremely fashionable photo...</p>
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "#666", fontSize: 11 }}>› Settings</span></div>
              </div>
              {/* Connection dots */}
              <div style={{ position: "absolute", left: -6, top: 200, width: 12, height: 12, borderRadius: "50%", background: "#f59e0b", border: "2px solid #e5e5e5" }} />
              <div style={{ position: "absolute", left: -6, top: 300, width: 12, height: 12, borderRadius: "50%", background: "#3b82f6", border: "2px solid #e5e5e5" }} />
              <div style={{ position: "absolute", right: -6, top: 180, width: 12, height: 12, borderRadius: "50%", background: "#3b82f6", border: "2px solid #e5e5e5" }} />
            </div>

            {/* Node 2 */}
            <div style={{ position: "absolute", top: -20, left: 480, width: 280, background: "#e5e5e5", borderRadius: 12, boxShadow: "0 24px 60px rgba(0,0,0,0.4)", overflow: "hidden", zIndex: 1, transform: "rotate(-2deg)" }}>
              <div style={{ height: 180, background: "#000" }}>
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%) contrast(120%)" }} alt="portrait" />
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><span style={{ fontSize: 10, color: "#666", fontWeight: 600 }}>Prompt</span><span style={{ fontSize: 10, color: "#666" }}>Video</span></div>
                <p style={{ fontSize: 12, color: "#333", lineHeight: 1.5, margin: 0 }}>Model doing subtle movements, realistic facial motion, cinematic portrait</p>
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "#666", fontSize: 11 }}>› Settings</span></div>
              </div>
              <div style={{ position: "absolute", left: -6, top: 190, width: 12, height: 12, borderRadius: "50%", background: "#eab308", border: "2px solid #e5e5e5" }} />
              <div style={{ position: "absolute", right: -6, top: 170, width: 12, height: 12, borderRadius: "50%", background: "#22c55e", border: "2px solid #e5e5e5" }} />
            </div>

            {/* Blurred foreground node */}
            <div style={{ position: "absolute", top: 180, left: -60, width: 240, background: "#e5e5e5", borderRadius: 12, boxShadow: "0 24px 60px rgba(0,0,0,0.6)", overflow: "hidden", zIndex: 3, filter: "blur(6px)", opacity: 0.6 }}>
              <div style={{ height: 140, background: "#000" }}></div>
              <div style={{ padding: 16, height: 100 }}></div>
              <div style={{ position: "absolute", right: -6, top: 140, width: 12, height: 12, borderRadius: "50%", background: "#3b82f6", border: "2px solid #e5e5e5" }} />
            </div>
          </div>
          
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, var(--bg) 0%, transparent 60%)", pointerEvents: "none", zIndex: 4 }} />
          
          {/* Content (Left side) */}
          <div style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 60px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #3b82f6, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(59,130,246,0.4)" }}>
                <Network size={22} color="#ffffff" strokeWidth={2.5} />
              </div>
              <h1 style={{ fontSize: 36, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.03em" }}>Node Editor</h1>
            </div>
            
            <p style={{ fontSize: 16, color: "var(--text-secondary)", margin: "0 0 32px", maxWidth: 440, lineHeight: 1.6, fontWeight: 400 }}>
              Nodes is the most powerful way to operate NextFlow. Connect every tool and model into complex automated pipelines.
            </p>
            
            <button onClick={handleCreate} disabled={isCreating} style={{ padding: "12px 24px", borderRadius: 999, background: "var(--text)", color: "var(--bg)", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, opacity: isCreating ? 0.7 : 1, transition: "opacity 150ms", width: "fit-content", boxShadow: "0 8px 24px var(--border-subtle)" }}>
              {isCreating ? "Creating..." : "New Workflow"} <span style={{ fontSize: 16, lineHeight: 1 }}>&rarr;</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "16px 28px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: tab === t ? 600 : 400,
              background: tab === t ? "var(--nav-active)" : "transparent",
              color: tab === t ? "var(--text)" : "var(--text-muted)",
              border: "none", cursor: "pointer", marginBottom: -1, transition: "all 100ms",
            }}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, padding: "28px" }}>
          {tab === "Projects" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {/* Create blank */}
              <button onClick={handleCreate} disabled={isCreating} style={{ height: 240, borderRadius: 12, border: "1px dashed var(--border)", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", transition: "all 180ms", color: "var(--text-muted)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"; e.currentTarget.style.background = "rgba(139,92,246,0.04)"; e.currentTarget.style.color = "#a78bfa"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
              >
                <div style={{ width: 48, height: 48, borderRadius: "50%", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={22} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{isCreating ? "Creating..." : "Create Blank Workflow"}</span>
              </button>
              {wfs.map(wf => <WorkflowCard key={wf.id} wf={wf} onDelete={setDeleteId} />)}
            </div>
          )}
          {tab === "Templates" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", overflow: "hidden" }}>
                <div style={{ height: 140, background: "var(--canvas-bg)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", backgroundImage: "radial-gradient(circle,var(--border-subtle) 1px,transparent 1px)", backgroundSize: "16px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {["#10b981","#8b5cf6","#f59e0b","#3b82f6"].map((c,i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 28, height: 20, borderRadius: 5, background: c+"18", border: `1px solid ${c}30` }} />
                        {i < 3 && <div style={{ width: 10, height: 1, background: "rgba(139,92,246,0.3)" }} />}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Product Marketing Kit Generator</p>
                  <p style={{ margin: "6px 0 14px", fontSize: 12, color: "var(--text-muted)" }}>Parallel image and video processing with AI-generated copy</p>
                  <button onClick={handleLoadSample} disabled={isCreating} style={{ width: "100%", padding: "8px", borderRadius: 8, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {isCreating ? "Loading..." : "Launch Sample →"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {(tab === "Apps" || tab === "Examples") && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, color: "var(--text-muted)" }}>
              <p style={{ fontSize: 14, margin: 0 }}>No {tab.toLowerCase()} yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete modal */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <div style={{ width: 380, background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", padding: 24, boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Delete Workflow</h3>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-muted)" }}>Are you sure you want to delete this workflow? This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding: "8px 16px", borderRadius: 8, background: "#f87171", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
