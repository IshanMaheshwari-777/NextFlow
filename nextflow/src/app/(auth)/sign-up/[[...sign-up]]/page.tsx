import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Lock, Zap } from "lucide-react";

export default function SignUpPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", position: "relative", fontFamily: "sans-serif" }}>
      
      {/* Grid background */}
      <div style={{ 
        position: "absolute", inset: 0, 
        backgroundImage: "linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)", 
        backgroundSize: "32px 32px", pointerEvents: "none", zIndex: 0 
      }} />

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
        
        <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
          Already have an account? <Link href="/sign-in" style={{ color: "var(--text)", textDecoration: "none" }}>Log in</Link>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 64, position: "relative", zIndex: 10 }}>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--text)", margin: "0 0 8px" }}>Create an account</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, fontWeight: 500 }}>Sign up for your NextFlow workspace</p>
        </div>

        <div style={{ width: "100%", maxWidth: 360, position: "relative" }}>
          {/* Clerk uses the appearance config from layout.tsx globally */}
          <SignUp 
            forceRedirectUrl="/dashboard" 
            appearance={{
              elements: {
                header: "hidden",
                footer: "hidden",
                cardBox: "shadow-none", // Remove extra outer shadow if any
              }
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", fontWeight: 500 }}>
            By continuing you agree to our <span style={{ color: "var(--text-secondary)", cursor: "pointer" }}>Terms</span> & <span style={{ color: "var(--text-secondary)", cursor: "pointer" }}>Privacy Policy</span>
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
            <Lock size={10} /> Secured end-to-end
          </div>
        </div>

      </div>
    </div>
  );
}
