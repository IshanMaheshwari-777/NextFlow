import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MousePointer2, Play, GitMerge, Zap } from "lucide-react";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", position: "relative", overflowX: "hidden", color: "var(--text)", fontFamily: "sans-serif" }}>
      
      {/* Navbar */}
      <nav style={{ 
        height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", 
        padding: "0 32px", position: "relative", zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--text)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={14} fill="currentColor" />
          </div>
          <span style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>NextFlow</span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/sign-in" style={{ 
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--text)", 
            border: "1px solid var(--border)", background: "transparent", textDecoration: "none"
          }}>
            Log in
          </Link>
          <Link href="/sign-up" style={{ 
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--text)", 
            border: "1px solid var(--border)", background: "transparent", textDecoration: "none"
          }}>
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 10, paddingTop: 80 }}>
        
        {/* Beta badge */}
        <div style={{ 
          display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", 
          borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface)",
          marginBottom: 32
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>Beta is live — free to start</span>
        </div>

        <h1 style={{ 
          fontSize: 72, fontWeight: 700, margin: 0, 
          letterSpacing: "-0.04em", lineHeight: 1.05, textAlign: "center" 
        }}>
          <span style={{ color: "var(--text)" }}>Design AI pipelines</span><br />
          <span style={{ color: "var(--text-muted)" }}>without the chaos.</span>
        </h1>

        <p style={{ 
          fontSize: 16, color: "var(--text-secondary)", maxWidth: 500, textAlign: "center", 
          lineHeight: 1.6, margin: "24px auto 32px", fontWeight: 500
        }}>
          The node-based editor for building, testing, and shipping<br />AI workflows — no backend required.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/sign-up" style={{ 
            padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, 
            color: "var(--bg)", background: "var(--text)", border: "1px solid var(--border)", textDecoration: "none"
          }}>
            Start building free
          </Link>
          <Link href="/sign-up" style={{ 
            padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, 
            color: "var(--text)", background: "transparent", border: "1px solid var(--border)", textDecoration: "none",
            display: "flex", alignItems: "center", gap: 6
          }}>
            View examples &rarr;
          </Link>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 16, fontWeight: 500 }}>
          No credit card required
        </p>

        {/* Mockup Canvas */}
        <div style={{ 
          marginTop: 64, width: "100%", maxWidth: 860, margin: "64px 32px 0", 
          borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", 
          background: "var(--surface)"
        }}>
          {/* Header */}
          <div style={{ 
            height: 48, borderBottom: "1px solid var(--border)", display: "flex", 
            alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: "var(--surface)"
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f56" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffbd2e" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#27c93f" }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
              Product Marketing Kit Generator
            </div>
            <div style={{ 
              padding: "4px 12px", border: "1px solid var(--border)", color: "var(--text)", 
              borderRadius: 6, fontSize: 12, fontWeight: 500, background: "var(--surface-hover)", display: "flex", alignItems: "center", gap: 4
            }}>
              <Play size={10} /> Run
            </div>
          </div>
          
          {/* Canvas grid & nodes */}
          <div style={{ 
            height: 240, background: "var(--canvas-bg)", position: "relative", 
            backgroundImage: "linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)", backgroundSize: "32px 32px"
          }}>
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              {/* Lines */}
              <path d="M 180 120 L 260 120" stroke="var(--border)" strokeWidth="1.5" fill="none" />
              <circle cx="180" cy="120" r="3" fill="var(--canvas-bg)" stroke="var(--text-muted)" strokeWidth="1.5" />
              <circle cx="260" cy="120" r="3" fill="var(--canvas-bg)" stroke="var(--text-muted)" strokeWidth="1.5" />

              <path d="M 400 120 L 480 120" stroke="var(--border)" strokeWidth="1.5" fill="none" />
              <circle cx="400" cy="120" r="3" fill="var(--canvas-bg)" stroke="var(--text-muted)" strokeWidth="1.5" />
              <circle cx="480" cy="120" r="3" fill="var(--canvas-bg)" stroke="var(--text-muted)" strokeWidth="1.5" />

              <path d="M 580 120 L 660 120" stroke="var(--border)" strokeWidth="1.5" fill="none" />
              <circle cx="580" cy="120" r="3" fill="var(--canvas-bg)" stroke="var(--text-muted)" strokeWidth="1.5" />
              <circle cx="660" cy="120" r="3" fill="var(--canvas-bg)" stroke="var(--text-muted)" strokeWidth="1.5" />
            </svg>
            
            {/* Nodes */}
            <div style={{ position: "absolute", top: 104, left: 60, width: 120, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "var(--node-bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 11, fontWeight: 600 }}>
              Text Input
            </div>
            <div style={{ position: "absolute", top: 104, left: 260, width: 140, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "var(--node-bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 11, fontWeight: 600 }}>
              Enhance Prompt
            </div>
            <div style={{ position: "absolute", top: 104, left: 480, width: 100, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "var(--node-bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 11, fontWeight: 600 }}>
              Run LLM
            </div>
            <div style={{ position: "absolute", top: 104, left: 660, width: 100, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "var(--node-bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 11, fontWeight: 600 }}>
              Output
            </div>
          </div>
        </div>

        {/* Separator Line */}
        <div style={{ width: "100%", height: 1, background: "var(--border-subtle)", marginTop: 80 }} />

        {/* Features */}
        <div style={{ width: "100%", maxWidth: 1000, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40, padding: "80px 32px 100px", margin: "0 auto", alignItems: "start" }}>
          <div>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <MousePointer2 size={16} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 12px" }}>Node-based editor</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>Connect any model or tool visually. No glue code, no YAML, no surprises.</p>
          </div>
          <div>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Play size={16} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 12px" }}>Run instantly</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>Test pipelines in one click. See live output stream through each node.</p>
          </div>
          <div>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <GitMerge size={16} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 12px" }}>8 built-in nodes</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>Text, LLM, Image, Video, Crop, Frame extract, Generate, and Enhance — all wired up.</p>
          </div>
        </div>

      </main>

    </div>
  );
}
