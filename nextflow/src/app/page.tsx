import Link from "next/link";
import { Zap, Play, Sparkles, Type } from "lucide-react";
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
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      {/* Background Grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(to right, var(--border-subtle) 1px, transparent 1px), linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px)", backgroundSize: "64px 64px", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%, transparent 0%, var(--bg) 100%)", pointerEvents: "none", zIndex: 0 }} />

      {/* NAVBAR */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", width: "100%", height: 64,
        background: "transparent",
        userSelect: "none", flexShrink: 0, position: "relative", zIndex: 10,
      }}>
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textDecoration: "none" }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Zap style={{ width: 14, height: 14, color: "var(--bg)", fill: "var(--bg)" }} />
          </div>
          <span style={{ color: "var(--text)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>NextFlow</span>
        </Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {!userId ? (
            <>
              <Link href="/sign-in" style={{ textDecoration: "none" }}>
                <button style={{
                  background: "transparent", color: "var(--text)", border: "none",
                  padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  transition: "opacity 150ms ease"
                }}>
                  Log in
                </button>
              </Link>
              <Link href="/sign-up" style={{ textDecoration: "none" }}>
                <button style={{
                  background: "var(--text)", color: "var(--bg)", border: "none",
                  padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  borderRadius: 999, transition: "transform 150ms ease"
                }}>
                  Sign up
                </button>
              </Link>
            </>
          ) : (
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <button style={{
                background: "var(--text)", color: "var(--bg)", border: "none",
                padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                borderRadius: 999, transition: "transform 150ms ease"
              }}>
                Dashboard →
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 10, paddingTop: "12vh" }}>
        
        {/* HERO */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: 800, padding: "0 20px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface)", marginBottom: 32 }}>
            <Sparkles size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>NextFlow Beta is live</span>
          </div>

          <h1 style={{ color: "var(--text)", fontSize: "clamp(48px, 8vw, 84px)", fontWeight: 700, letterSpacing: "-0.04em", margin: "0 0 24px", lineHeight: 1 }}>
            Design AI pipelines visually.
          </h1>
          
          <p style={{ color: "var(--text-muted)", fontSize: "clamp(18px, 3vw, 22px)", maxWidth: 600, margin: "0 0 48px", lineHeight: 1.5, fontWeight: 400 }}>
            Connect models, tools, and logic in an intuitive node editor. Build complex AI apps without writing a single line of backend code.
          </p>

          {!userId ? (
            <Link href="/sign-up" style={{ textDecoration: "none" }}>
              <button style={{
                background: "var(--text)", color: "var(--bg)", border: "none",
                padding: "16px 36px", fontSize: 16, fontWeight: 600, cursor: "pointer",
                borderRadius: 999, display: "flex", alignItems: "center", gap: 10,
                boxShadow: "0 12px 32px var(--border)", transition: "transform 150ms ease"
              }}>
                Start Building Free
              </button>
            </Link>
          ) : (
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <button style={{
                background: "var(--text)", color: "var(--bg)", border: "none",
                padding: "16px 36px", fontSize: 16, fontWeight: 600, cursor: "pointer",
                borderRadius: 999, display: "flex", alignItems: "center", gap: 10,
                boxShadow: "0 12px 32px var(--border)", transition: "transform 150ms ease"
              }}>
                Go to Dashboard
              </button>
            </Link>
          )}
        </div>

        {/* MOCK UI PREVIEW */}
        <div style={{ marginTop: 80, width: "100%", maxWidth: 1000, position: "relative" }}>
          <div style={{ width: "100%", height: 500, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "24px 24px 0 0", boxShadow: "0 24px 80px rgba(0,0,0,0.2)", overflow: "hidden", position: "relative" }}>
            
            {/* Header Mock */}
            <div style={{ height: 56, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--border)" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--border)" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--border)" }} />
              </div>
            </div>

            {/* Canvas Mock */}
            <div style={{ position: "relative", width: "100%", height: "100%", backgroundImage: "linear-gradient(to right, var(--border-subtle) 1px, transparent 1px), linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
              {/* Nodes */}
              <div style={{ position: "absolute", top: 80, left: 120, width: 240, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Type size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Text Input</span>
                </div>
                <div style={{ height: 40, background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)" }} />
              </div>
              
              <div style={{ position: "absolute", top: 160, left: 480, width: 280, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Sparkles size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>LLM Processor</span>
                </div>
                <div style={{ height: 80, background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)" }} />
              </div>

              {/* Connecting line */}
              <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                <path d="M 360 140 C 420 140, 420 200, 480 200" fill="none" stroke="var(--border)" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
