import Link from "next/link";
import { Zap, Play, Sparkles, Type, MessageSquareText } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

export default async function LandingPage() {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (e) {
    // ignore
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", flexDirection: "column" }}>
      {/* NAVBAR */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", width: "100%", height: 56,
        background: "#0e0e14", borderBottom: "1px solid #1c1c28",
        userSelect: "none", flexShrink: 0,
      }}>
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textDecoration: "none", transition: "opacity 150ms ease" }}
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
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {!userId ? (
            <>
              <Link href="/sign-in" style={{ textDecoration: "none" }}>
                <button style={{
                  background: "transparent", color: "#e4e4ed", border: "none",
                  padding: "8px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer",
                  borderRadius: 8, transition: "background 150ms ease"
                }}>
                  Sign in
                </button>
              </Link>
              <Link href="/sign-up" style={{ textDecoration: "none" }}>
                <button style={{
                  background: "#12121a", color: "#fff", border: "1px solid rgba(139,92,246,0.3)",
                  padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  borderRadius: 8, boxShadow: "0 0 20px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.03)",
                  transition: "all 150ms ease"
                }}>
                  Get Started
                </button>
              </Link>
            </>
          ) : (
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <button style={{
                background: "#12121a", color: "#fff", border: "1px solid rgba(139,92,246,0.3)",
                padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                borderRadius: 8, boxShadow: "0 0 20px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.03)",
                transition: "all 150ms ease"
              }}>
                Go to Dashboard
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "80px", paddingBottom: "80px", paddingLeft: 20, paddingRight: 20 }}>
        {/* HERO */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "60px" }}>
          <h1 style={{ color: "#e4e4ed", fontSize: 52, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, textAlign: "center", lineHeight: 1.1 }}>
            Build AI Workflows Visually
          </h1>
          <p style={{ color: "#8b8b9e", fontSize: 18, maxWidth: 500, textAlign: "center", marginBottom: 32, lineHeight: 1.5 }}>
            Design, execute, and monitor powerful LLM pipelines in an intuitive, node-based workspace. No complex setup required.
          </p>
          {!userId ? (
            <Link href="/sign-up" style={{ textDecoration: "none" }}>
              <button style={{
                background: "#12121a", color: "#fff", border: "1px solid rgba(139,92,246,0.3)",
                padding: "12px 32px", fontSize: 16, fontWeight: 600, cursor: "pointer",
                borderRadius: 8, boxShadow: "0 0 30px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
                transition: "all 150ms ease", display: "flex", alignItems: "center", gap: 8
              }}>
                Start Building Now
              </button>
            </Link>
          ) : (
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <button style={{
                background: "#12121a", color: "#fff", border: "1px solid rgba(139,92,246,0.3)",
                padding: "12px 32px", fontSize: 16, fontWeight: 600, cursor: "pointer",
                borderRadius: 8, boxShadow: "0 0 30px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
                transition: "all 150ms ease", display: "flex", alignItems: "center", gap: 8
              }}>
                Open Dashboard
              </button>
            </Link>
          )}
        </div>

        {/* PRODUCT PREVIEW */}
        <div style={{
          width: "100%", maxWidth: 1000, height: 440, position: "relative",
          background: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
          backgroundSize: "24px 24px", backgroundColor: "#0a0a0f",
          border: "1px solid #1c1c28", borderRadius: 16,
          boxShadow: "0 0 80px rgba(139,92,246,0.1), 0 20px 40px rgba(0,0,0,0.5)",
          overflow: "hidden"
        }}>
          {/* Top bar of the fake canvas */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 48, background: "rgba(14,14,20,0.8)", borderBottom: "1px solid #1c1c28", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", padding: "0 16px", justifyContent: "space-between", zIndex: 10 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4a4a5e" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4a4a5e" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4a4a5e" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#12121a", padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(139,92,246,0.3)", boxShadow: "0 0 10px rgba(139,92,246,0.15)" }}>
              <Play style={{ width: 12, height: 12, color: "#fff", fill: "#fff" }} />
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Run Workflow</span>
            </div>
          </div>

          {/* Fake Edges */}
          <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
            <path d="M 320 220 C 380 220, 380 220, 440 220" fill="none" stroke="rgba(139,92,246,0.3)" strokeWidth="2" />
            <path d="M 640 220 C 700 220, 700 220, 760 220" fill="none" stroke="rgba(139,92,246,0.3)" strokeWidth="2" />
          </svg>

          {/* Fake Node 1: Text */}
          <div style={{ position: "absolute", left: 80, top: 160, width: 240, background: "#0c0c12", border: "1px solid #1c1c28", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", zIndex: 2 }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #1c1c28", display: "flex", alignItems: "center", gap: 8, background: "#12121a", borderRadius: "8px 8px 0 0" }}>
              <Type style={{ width: 14, height: 14, color: "#6366f1" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e4e4ed" }}>System Prompt</span>
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ width: "100%", height: 40, background: "#0e0e14", borderRadius: 4, border: "1px solid #1c1c28", padding: 8 }}>
                <span style={{ fontSize: 11, color: "#8b8b9e" }}>You are a helpful AI...</span>
              </div>
            </div>
            <div style={{ position: "absolute", right: -5, top: 60, width: 10, height: 10, background: "#12121a", border: "2px solid rgba(255,255,255,0.08)", borderRadius: "50%" }} />
          </div>

          {/* Fake Node 2: LLM */}
          <div style={{ position: "absolute", left: 440, top: 120, width: 200, background: "#0c0c12", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, boxShadow: "0 0 0 1px rgba(139,92,246,0.1), 0 8px 24px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", zIndex: 2 }}>
            <div style={{ position: "absolute", left: -5, top: 100, width: 10, height: 10, background: "#12121a", border: "2px solid rgba(255,255,255,0.08)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", right: -5, top: 100, width: 10, height: 10, background: "#12121a", border: "2px solid rgba(255,255,255,0.08)", borderRadius: "50%" }} />

            <div style={{ padding: "8px 12px", borderBottom: "1px solid #1c1c28", display: "flex", alignItems: "center", gap: 8, background: "#12121a", borderRadius: "8px 8px 0 0" }}>
              <Sparkles style={{ width: 14, height: 14, color: "#8b5cf6" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e4e4ed" }}>Run LLM</span>
            </div>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10, color: "#4a4a5e", textTransform: "uppercase", fontWeight: 700 }}>Model</span>
                <div style={{ width: "100%", height: 28, background: "#0e0e14", borderRadius: 4, border: "1px solid #1c1c28", display: "flex", alignItems: "center", padding: "0 8px" }}>
                  <span style={{ fontSize: 11, color: "#e4e4ed" }}>Llama 3.3 70B</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10, color: "#4a4a5e", textTransform: "uppercase", fontWeight: 700 }}>Prompt — Connected</span>
                <div style={{ width: "100%", height: 40, background: "rgba(139,92,246,0.05)", borderRadius: 4, border: "1px dashed rgba(139,92,246,0.3)" }} />
              </div>
            </div>
          </div>

          {/* Fake Node 3: Output */}
          <div style={{ position: "absolute", left: 760, top: 160, width: 160, background: "#0c0c12", border: "1px solid #1c1c28", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", zIndex: 2 }}>
            <div style={{ position: "absolute", left: -5, top: 60, width: 10, height: 10, background: "#12121a", border: "2px solid rgba(255,255,255,0.08)", borderRadius: "50%" }} />
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #1c1c28", display: "flex", alignItems: "center", gap: 8, background: "#12121a", borderRadius: "8px 8px 0 0" }}>
              <MessageSquareText style={{ width: 14, height: 14, color: "#34d399" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e4e4ed" }}>Output</span>
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ width: "100%", height: 40, background: "#0e0e14", borderRadius: 4, border: "1px solid #1c1c28", display: "flex", alignItems: "center", padding: "0 8px" }}>
                <span style={{ fontSize: 11, color: "#8b8b9e" }}>Result ready...</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
