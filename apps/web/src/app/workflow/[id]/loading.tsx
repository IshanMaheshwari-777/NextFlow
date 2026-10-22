/** Editor-shaped skeleton: top bar + dotted canvas, so opening a workflow feels instant. */
export default function WorkflowLoading() {
  return (
    <div className="editor-shell" aria-busy="true" aria-label="Loading workflow">
      <div className="topbar">
        <div className="topbar-left"><div className="skeleton" style={{ width: 22, height: 22, borderRadius: 6, margin: "0 8px" }} /><div className="skeleton sk-line" style={{ width: 160 }} /></div>
        <div className="topbar-right"><div className="skeleton" style={{ width: 84, height: 30, borderRadius: 8 }} /></div>
      </div>
      <div style={{ flex: 1, background: "radial-gradient(circle, var(--dot-color) 1.2px, transparent 1.2px) 0 0 / 24px 24px, var(--canvas-bg)", display: "flex", alignItems: "center", justifyContent: "center", gap: 48 }}>
        {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ width: 220, height: 150 + i * 30, borderRadius: 14, opacity: 0.6 }} />)}
      </div>
    </div>
  );
}
