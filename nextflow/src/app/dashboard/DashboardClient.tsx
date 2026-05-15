"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Plus, ChevronsRight, Network, MoreHorizontal, Trash2, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import * as Icons from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { SIDEBAR_NODES } from "@/types";

type Workflow = {
  id: string;
  name: string;
  updatedAt: string | Date;
  nodes?: any[];
};

export default function DashboardClient({ workflows, recentRuns = [] }: { workflows: Workflow[], recentRuns?: any[] }) {
  const router = useRouter();
  const [wfs, setWfs] = useState(workflows);
  const [isCreating, setIsCreating] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Workflow" }),
      });
      const data = await res.json();
      if (data.id) router.push(`/workflow/${data.id}`);
    } catch (e) {
      console.error(e);
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    // Replaced by the custom modal logic
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden", background: "#0a0a0f" }}>
      {/* TopBar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", width: "100%", height: 56,
        background: "#0e0e14", borderBottom: "1px solid #1c1c28",
        userSelect: "none", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textDecoration: "none" }}>
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
          <span style={{ color: "#8b8b9e", fontSize: 14, fontWeight: 500 }}>Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Mock Left Sidebar (visual only) */}
        <div style={{
          flexShrink: 0, height: "100%", display: "flex", flexDirection: "column",
          background: "#0e0e14", borderRight: "1px solid #1c1c28", width: 52,
        }}>
          <div style={{ width: 52, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 4, height: "100%" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#4a4a5e", marginBottom: 8, opacity: 0.5 }}>
              <ChevronsRight style={{ width: 16, height: 16 }} />
            </div>
            <div style={{ width: 24, height: 1, background: "#1c1c28", marginBottom: 4 }} />
            {SIDEBAR_NODES.map(node => {
              const Icon = (Icons as any)[node.icon];
              return (
                <div key={node.type} title={node.label} style={{
                  width: 36, height: 36, borderRadius: 10, background: `${node.color}0a`,
                  display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5
                }}>
                  {Icon && <Icon style={{ width: 16, height: 16, color: node.color }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dashboard Content */}
        <div style={{ flex: 1, position: "relative", overflowY: "auto", padding: "40px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Your Workflows</h1>
            <p style={{ color: "#8b8b9e", marginBottom: 32 }}>Manage and build your AI pipelines.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {/* Create New Card */}
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                style={{
                  height: 240, borderRadius: 12, border: "2px dashed #1c1c28",
                  background: "transparent", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer",
                  transition: "all 200ms ease", color: "#8b8b9e"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)";
                  e.currentTarget.style.background = "rgba(139,92,246,0.05)";
                  e.currentTarget.style.color = "#a78bfa";
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.3)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#1c1c28";
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#8b8b9e";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus style={{ width: 24, height: 24, color: "#a78bfa" }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{isCreating ? "Creating..." : "New Workflow"}</span>
              </button>

              {/* Load Sample Card */}
              <button
                type="button"
                onClick={async () => {
                  setIsCreating(true);
                  try {
                    const res = await fetch("/api/workflow", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ sample: true }),
                    });
                    const data = await res.json();
                    if (data.id) router.push(`/workflow/${data.id}`);
                  } catch (e) {
                    console.error(e);
                    setIsCreating(false);
                  }
                }}
                disabled={isCreating}
                style={{
                  height: 240, borderRadius: 12, border: "2px dashed #1c1c28",
                  background: "transparent", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer",
                  transition: "all 200ms ease", color: "#8b8b9e"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "rgba(52,211,153,0.5)";
                  e.currentTarget.style.background = "rgba(52,211,153,0.05)";
                  e.currentTarget.style.color = "#34d399";
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.3)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#1c1c28";
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#8b8b9e";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(52,211,153,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Zap style={{ width: 24, height: 24, color: "#34d399" }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Load Sample Workflow</span>
              </button>

              {/* Workflow Cards */}
              {wfs.map(wf => (
                <Link key={wf.id} href={`/workflow/${wf.id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    height: 240, borderRadius: 12, border: "1px solid #1c1c28",
                    background: "#12121a", display: "flex", flexDirection: "column",
                    cursor: "pointer", transition: "all 200ms ease",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    overflow: "hidden"
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "#8b5cf6";
                      e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.3)";
                      e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "#1c1c28";
                      e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {/* TOP PREVIEW */}
                    <div style={{
                      height: 140, width: "100%", background: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
                      backgroundSize: "16px 16px", backgroundColor: "#0a0a0f",
                      borderBottom: "1px solid #1c1c28", display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0c0c12", border: "1px solid #1c1c28", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1" }} /></div>
                        <div style={{ width: 20, height: 1, background: "rgba(139,92,246,0.4)" }} />
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0c0c12", border: "1px solid rgba(139,92,246,0.5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(139,92,246,0.2)" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6" }} /></div>
                        <div style={{ width: 20, height: 1, background: "rgba(139,92,246,0.4)" }} />
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0c0c12", border: "1px solid #1c1c28", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399" }} /></div>
                      </div>
                    </div>

                    {/* CARD CONTENT */}
                    <div style={{ padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#e4e4ed", margin: "0 0 4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {wf.name}
                        </h3>
                        <p style={{ fontSize: 12, color: "#8b8b9e", margin: 0 }}>
                          {wf.nodes?.length || 0} nodes
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, color: "#4a4a5e" }}>Updated {new Date(wf.updatedAt).toLocaleDateString()}</span>
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setWorkflowToDelete(wf);
                          }}
                          style={{
                            width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                            background: "transparent", color: "#4a4a5e", transition: "all 150ms ease"
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(248,113,113,0.1)"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "#4a4a5e"; e.currentTarget.style.background = "transparent"; }}
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel (Activity) */}
        <div style={{
          flexShrink: 0, height: "100%", display: "flex", flexDirection: "column",
          background: "#0e0e14", borderLeft: "1px solid #1c1c28", width: 280,
          padding: 16, overflowY: "auto"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: "#4a4a5e", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>Recent Activity</h2>
          </div>

          {recentRuns.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, opacity: 0.5 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#16161f", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Clock style={{ width: 20, height: 20, color: "#4a4a5e" }} />
              </div>
              <span style={{ fontSize: 12, color: "#4a4a5e" }}>No recent runs</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recentRuns.map((run) => (
                <div key={run.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 8, background: "#12121a", border: "1px solid #1c1c28" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e4e4ed" }}>{run.workflow?.name || "Workflow"}</span>
                    {run.status === "success" && <CheckCircle2 style={{ width: 14, height: 14, color: "#34d399" }} />}
                    {run.status === "failed" && <XCircle style={{ width: 14, height: 14, color: "#f87171" }} />}
                    {run.status === "running" && <Loader2 style={{ width: 14, height: 14, color: "#8b5cf6" }} className="animate-spin" />}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#8b8b9e" }}>
                    <span>{new Date(run.createdAt).toLocaleString()}</span>
                    <span style={{ textTransform: "capitalize" }}>{run.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {workflowToDelete && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
          background: "rgba(10,10,15,0.8)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            width: 400, background: "#12121a", borderRadius: 16, border: "1px solid #1c1c28",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)", padding: 24, display: "flex", flexDirection: "column"
          }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700, color: "#fff" }}>Delete Workflow</h3>
            <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "#8b8b9e", lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>{workflowToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                disabled={isDeleting}
                onClick={() => setWorkflowToDelete(null)}
                style={{
                  background: "transparent", color: "#e4e4ed", border: "1px solid #1c1c28",
                  padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  transition: "all 150ms ease"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#16161f"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const res = await fetch(`/api/workflow/${workflowToDelete.id}`, { method: "DELETE" });
                    if (res.ok) {
                      setWfs(wfs.filter(w => w.id !== workflowToDelete.id));
                      setWorkflowToDelete(null);
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                style={{
                  background: "#f87171", color: "#fff", border: "none",
                  padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  transition: "all 150ms ease", opacity: isDeleting ? 0.7 : 1
                }}
                onMouseEnter={e => !isDeleting && (e.currentTarget.style.background = "#ef4444")}
                onMouseLeave={e => !isDeleting && (e.currentTarget.style.background = "#f87171")}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
