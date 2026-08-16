export default function WorkflowLoading() {
  return (
    <div style={{
      height: "100vh", width: "100vw", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--canvas-bg)", position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)",
        width: 500, height: 500,
        background: "radial-gradient(circle, var(--border-subtle) 0%, transparent 70%)",
        pointerEvents: "none", animation: "pulse 2s ease-in-out infinite",
      }} />

      {/* Logo */}
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: "var(--text)", color: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20,
        boxShadow: "0 0 32px rgba(0,0,0,0.1)",
        animation: "pulse 2s ease-in-out infinite",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>

      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", margin: 0 }}>Loading workflow...</p>

      {/* Loading bar */}
      <div style={{ width: 160, height: 2, borderRadius: 2, background: "var(--border)", marginTop: 24, overflow: "hidden" }}>
        <div style={{ width: "35%", height: "100%", borderRadius: 2, background: "var(--text)", color: "var(--bg)", animation: "loadingBar 1.5s ease-in-out infinite" }} />
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.7} }
        @keyframes loadingBar { 0%{transform:translateX(-100%)}100%{transform:translateX(400%)} }
      `}</style>
    </div>
  );
}
