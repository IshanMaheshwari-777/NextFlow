"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

/** Maps low-level failures to something a user (or the developer running locally) can act on. */
function explain(message: string): { title: string; body: string } {
  const m = message.toLowerCase();
  if (m.includes("exceeded the quota") || m.includes("data transfer quota") || m.includes("compute time quota"))
    return { title: "The database is over its plan limit", body: "The Postgres provider (Neon) is refusing connections because the project used up its free quota. Upgrade the plan, wait for the monthly reset, or point DATABASE_URL at another database." };
  if (m.includes("can't reach database") || m.includes("p1001") || m.includes("connection refused") || m.includes("terminating connection"))
    return { title: "Can't reach the database", body: "The database didn't respond. It may be waking up from sleep — try again in a few seconds." };
  if (m.includes("database_url"))
    return { title: "Database isn't configured", body: "DATABASE_URL is missing. Copy apps/web/.env.example to apps/web/.env and fill it in." };
  return { title: "Something went wrong", body: "An unexpected error interrupted this page. Try again, or head back to your dashboard." };
}

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[ErrorBoundary]", error); }, [error]);
  const { title, body } = explain(error.message || "");
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg)" }}>
      <div style={{ width: "min(480px, 100%)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--error) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)", color: "var(--error)" }}>
          <AlertTriangle size={22} />
        </div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{title}</h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}>{body}</p>
        {isDev && error.message && (
          <pre style={{ margin: 0, width: "100%", maxHeight: 140, overflow: "auto", textAlign: "left", padding: "10px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 11.5, lineHeight: 1.5, color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{error.message}</pre>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button className="btn btn-primary" onClick={() => reset()}><RotateCw size={14} /> Try again</button>
          <Link className="btn btn-secondary" href="/dashboard" style={{ textDecoration: "none" }}>Back to dashboard</Link>
        </div>
        {error.digest && <p style={{ margin: 0, fontSize: 11, color: "var(--text-dim)" }}>Reference: {error.digest}</p>}
      </div>
    </div>
  );
}
