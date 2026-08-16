export default function Loading() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg)", position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)",
        width: 500, height: 500,
        background: "radial-gradient(circle, var(--border-subtle) 0%, transparent 70%)",
        pointerEvents: "none",
        animation: "pulse 2s ease-in-out infinite",
      }} />

      {/* Logo */}
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "var(--text)", color: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 24,
        boxShadow: "0 0 40px rgba(0,0,0,0.1)",
        animation: "pulse 2s ease-in-out infinite",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Loading workspace...</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Setting up your workflow</p>

      {/* Loading bar */}
      <div style={{
        width: 200, height: 3, borderRadius: 2, background: "var(--border)",
        marginTop: 32, overflow: "hidden",
      }}>
        <div style={{
          width: "40%", height: "100%", borderRadius: 2,
          background: "var(--text)",
          animation: "loadingBar 1.5s ease-in-out infinite",
        }} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes loadingBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
