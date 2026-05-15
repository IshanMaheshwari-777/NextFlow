import { SignIn } from "@clerk/nextjs";
import { Zap } from "lucide-react";

export default function SignInPage() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg)", position: "relative", overflow: "hidden",
    }}>
      {/* Background grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(to right, var(--border-subtle) 1px, transparent 1px), linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px)", backgroundSize: "64px 64px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, transparent 0%, var(--bg) 80%)", pointerEvents: "none" }} />

      {/* Branding */}
      <div style={{ textAlign: "center", position: "relative", zIndex: 10, marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <Zap style={{ width: 20, height: 20, color: "var(--bg)", fill: "var(--bg)" }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.03em", margin: 0 }}>Log in to NextFlow</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8, fontWeight: 500 }}>Welcome back</p>
      </div>

      {/* Clerk form */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <SignIn forceRedirectUrl="/dashboard" />
      </div>
    </div>
  );
}
