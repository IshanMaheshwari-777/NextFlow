/** Skeleton that mirrors the dashboard layout, so content doesn't jump when it arrives. */
export default function DashboardLoading() {
  return (
    <div className="dash" aria-busy="true" aria-label="Loading your workflows">
      <header className="dash-header"><div className="skeleton sk" style={{ width: 110, height: 22 }} /><div className="skeleton" style={{ width: 30, height: 30, borderRadius: 999 }} /></header>
      <main className="dash-main">
        <div className="skeleton sk-line" style={{ width: 280, height: 30, marginBottom: 12 }} />
        <div className="skeleton sk-line" style={{ width: 420, maxWidth: "80%", marginBottom: 36 }} />
        <div className="tpl-grid" style={{ marginBottom: 36 }}>
          {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 176, borderRadius: 14 }} />)}
        </div>
        <div className="wf-grid">
          {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 190, borderRadius: 14 }} />)}
        </div>
      </main>
    </div>
  );
}
