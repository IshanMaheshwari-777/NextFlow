import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Zap, ChevronDown, Image as ImageIcon, Video, Scissors, Sparkles, Cpu, LayoutDashboard } from "lucide-react";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main 
      style={{ 
        position: "relative", 
        height: "100dvh", 
        overflow: "hidden", 
        backgroundColor: "#000", 
        color: "#fff", 
        fontFamily: "system-ui, -apple-system, sans-serif" 
      }}
    >
      {/* ─── Header ─── */}
      <header style={{ 
        position: "sticky", 
        top: 0, 
        zIndex: 50, 
        width: "100%", 
        borderBottom: "1px solid rgba(255,255,255,0.12)", 
        backgroundColor: "rgba(0,0,0,0.7)", 
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)"
      }}>
        <div style={{ display: "flex", height: "60px", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
          
          {/* Logo */}
          <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
            <div style={{ color: "#fff" }}>
              <Zap size={20} fill="currentColor" />
            </div>
          </div>

          {/* Center Links */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="group" style={{ position: "relative", height: "60px", display: "flex", alignItems: "center" }}>
              <button 
                className="group-hover:bg-white group-hover:text-black transition-colors"
                style={{ 
                  display: "flex", alignItems: "center", gap: "6px", borderRadius: "9999px", 
                  padding: "6px 16px", fontSize: "14px", fontWeight: 500, 
                  color: "#fff", border: "none", background: "transparent", cursor: "pointer"
                }}
              >
                Features <ChevronDown size={14} style={{ opacity: 0.7 }} />
              </button>

              {/* Mega Menu Dropdown */}
              <div 
                className="pointer-events-none absolute top-[60px] opacity-0 shadow-2xl transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100" 
                style={{ 
                  left: "50%", transform: "translateX(-50%) translateY(8px)",
                  width: "960px", backgroundColor: "rgba(9, 9, 11, 0.95)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", color: "#fff", border: "1px solid rgba(255, 255, 255, 0.1)",
                  padding: "32px", borderRadius: "24px", display: "flex", gap: "40px",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
                }}
              >
                {/* Col 1 */}
                <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: "24px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.4)", margin: 0 }}>Generate</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: "#fff" }}>
                        <ImageIcon size={16} /> AI Image Generation
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "24px", fontSize: "13px" }}>
                        <span className="text-white/60 hover:text-white transition-colors cursor-pointer">Text to Image <span className="opacity-50">›</span></span>
                        <span className="text-white/60 hover:text-white transition-colors cursor-pointer">Flux Models <span className="opacity-50">›</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Col 2 */}
                <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: "24px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.4)", margin: 0 }}>Edit & Process</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: "#fff" }}>
                        <Scissors size={16} /> Media Processing
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "24px", fontSize: "13px" }}>
                        <span className="text-white/60 hover:text-white transition-colors cursor-pointer">Crop Image <span className="opacity-50">›</span></span>
                        <span className="text-white/60 hover:text-white transition-colors cursor-pointer">Extract Frame <span className="opacity-50">›</span></span>
                      </div>
                    </div>
                    <div>
                      <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: "#fff" }}>
                        <Sparkles size={16} /> AI Enhancements
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "24px", fontSize: "13px" }}>
                        <span className="text-white/60 hover:text-white transition-colors cursor-pointer">Video Enhance <span className="opacity-50">›</span></span>
                        <span className="text-white/60 hover:text-white transition-colors cursor-pointer">Upscale & Denoise <span className="opacity-50">›</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Col 3 */}
                <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: "24px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.4)", margin: 0 }}>Logic</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: "#fff" }}>
                        <Cpu size={16} /> AI Intelligence
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "24px", fontSize: "13px" }}>
                        <span className="text-white/60 hover:text-white transition-colors cursor-pointer">Run LLM (Llama 3) <span className="opacity-50">›</span></span>
                        <span className="text-white/60 hover:text-white transition-colors cursor-pointer">Prompt Engineering <span className="opacity-50">›</span></span>
                      </div>
                    </div>
                    <div>
                      <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: "#fff" }}>
                        <LayoutDashboard size={16} /> Core
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "24px", fontSize: "13px" }}>
                        <span className="text-white/60 hover:text-white transition-colors cursor-pointer">Text Input <span className="opacity-50">›</span></span>
                        <span className="text-white/60 hover:text-white transition-colors cursor-pointer">Media Upload <span className="opacity-50">›</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Card */}
                <div style={{ width: "260px", overflow: "hidden", borderRadius: "16px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
                  <div style={{ display: "flex", height: "100%", flexDirection: "column", justifyContent: "space-between" }}>
                    <div style={{ padding: "20px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "#fff" }}>
                        <Zap size={14} fill="currentColor" /> NextFlow
                      </span>
                    </div>
                    <div
                      style={{ 
                        display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "24px",
                        background: "linear-gradient(135deg, rgba(14,165,233,0.2) 0%, rgba(59,130,246,0.4) 100%)", minHeight: "180px",
                        borderTop: "1px solid rgba(255,255,255,0.1)"
                      }}
                    >
                      <p style={{ marginBottom: "6px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.7)", margin: 0 }}>New Feature</p>
                      <h4 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: 600, lineHeight: 1.2, color: "#fff", margin: "4px 0 16px" }}>
                        AI Video Enhancement
                      </h4>
                      <span className="hover:bg-white/90 transition-colors cursor-pointer" style={{ width: "fit-content", borderRadius: "8px", backgroundColor: "#fff", padding: "8px 16px", fontSize: "13px", fontWeight: 600, color: "#000" }}>
                        Try it out
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Auth */}
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end", gap: "12px" }}>
            <Link
              href="/sign-up"
              style={{ borderRadius: "9999px", backgroundColor: "#fff", padding: "6px 16px", fontSize: "14px", fontWeight: 600, color: "#000", textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Sign up for free
            </Link>
            <Link
              href="/sign-in"
              style={{ borderRadius: "9999px", border: "1px solid rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.05)", padding: "6px 16px", fontSize: "14px", fontWeight: 600, color: "#fff", textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Log in
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Content Area ─── */}
      <div
        style={{
          position: "relative",
          height: "calc(100dvh - 60px)",
          overflow: "hidden",
          backgroundColor: "#000",
          color: "#fff",
          backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 8%, rgba(0,0,0,0) 50%, rgba(0,0,0,0) 100%), url('/krea-bg.png')",
          backgroundPosition: "center bottom",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {/* The central container that draws the vertical lines framing the monitor */}
        <div 
          style={{ 
            width: "100%", 
            maxWidth: "840px", 
            height: "100%", 
            borderLeft: "1px solid rgba(255,255,255,0.06)", 
            borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            paddingTop: "7vh" 
          }}
        >
          <h1 style={{ textAlign: "center", fontSize: "64px", fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.03em", margin: 0 }}>
            <span style={{ color: "#fff" }}>Next</span>
            <span style={{ color: "#8a8a8e" }}>Flow</span>
            <span style={{ color: "#fff" }}> is the world's most<br />powerful creative AI suite.</span>
          </h1>

          <p style={{ marginTop: "20px", textAlign: "center", fontSize: "16px", color: "rgba(255,255,255,0.7)", margin: "20px 0 0", fontWeight: 400, letterSpacing: "-0.01em" }}>
            Build visual workflows to generate, enhance, and process images, videos, and text with AI.
          </p>

          <div style={{ marginTop: "32px", display: "flex", alignItems: "center", gap: "16px" }}>
            <Link
              href="/sign-up"
              style={{ borderRadius: "9999px", backgroundColor: "#fff", padding: "12px 28px", fontSize: "15px", fontWeight: 600, color: "#000", textDecoration: "none" }}
            >
              Start for free
            </Link>
            <Link
              href="/sign-in"
              style={{ borderRadius: "9999px", border: "1px solid rgba(255,255,255,0.2)", backgroundColor: "transparent", padding: "12px 28px", fontSize: "15px", fontWeight: 500, color: "#fff", textDecoration: "none" }}
            >
              Launch App
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
