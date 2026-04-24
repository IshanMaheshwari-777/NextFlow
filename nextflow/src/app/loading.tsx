export default function Loading() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#0a0a0f", position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)",
        width: 500, height: 500,
        background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
        animation: "pulse 2s ease-in-out infinite",
      }} />

      {/* Logo */}
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 24,
        boxShadow: "0 0 40px rgba(139,92,246,0.3)",
        animation: "pulse 2s ease-in-out infinite",
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24, color: "#fff" }}>
          <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
        </svg>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e4e4ed", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Loading workspace...</h2>
      <p style={{ fontSize: 13, color: "#4a4a5e", margin: 0 }}>Setting up your workflow</p>

      {/* Loading bar */}
      <div style={{
        width: 200, height: 3, borderRadius: 2, background: "#1c1c28",
        marginTop: 32, overflow: "hidden",
      }}>
        <div style={{
          width: "40%", height: "100%", borderRadius: 2,
          background: "linear-gradient(90deg, #8b5cf6, #a78bfa)",
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
