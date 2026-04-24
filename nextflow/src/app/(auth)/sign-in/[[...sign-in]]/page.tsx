import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#0a0a0f", position: "relative", overflow: "hidden",
    }}>
      {/* Background effects */}
      <div style={{
        position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)",
        width: 700, height: 700,
        background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: "60%", left: "30%", transform: "translate(-50%, -50%)",
        width: 400, height: 400,
        background: "radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Branding */}
      <div style={{ textAlign: "center", position: "relative", zIndex: 10, marginBottom: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
          boxShadow: "0 0 40px rgba(139,92,246,0.3), 0 0 80px rgba(139,92,246,0.1)",
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24, color: "#fff" }}>
            <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e4e4ed", letterSpacing: "-0.03em", margin: 0 }}>NextFlow</h1>
        <p style={{ fontSize: 14, color: "#4a4a5e", marginTop: 8, fontWeight: 500 }}>AI Workflow Builder</p>
      </div>

      {/* Clerk form */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <SignIn />
      </div>

      {/* Footer */}
      <p style={{ position: "relative", zIndex: 10, fontSize: 12, color: "#2e2e3e", marginTop: 40 }}>
        Build • Automate • Scale
      </p>
    </div>
  );
}
