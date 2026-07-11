"use client";
import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div style={{
      height: "100vh", width: "100vw", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      background: "var(--canvas-bg, #09090b)", color: "var(--text, #fafafa)", padding: "2rem", textAlign: "center",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: "var(--error, #ef4444)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="10" />
        </svg>
      </div>
      <div>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>Something went wrong</h2>
        <p style={{ margin: 0, color: "var(--text-secondary, #a1a1aa)", fontSize: 14, maxWidth: 420 }}>
          An unexpected error interrupted this page. It&apos;s been logged — try again, or head back to your dashboard.
        </p>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={() => reset()}
          style={{ padding: "8px 16px", background: "var(--text, #fafafa)", color: "var(--bg, #09090b)", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
        >
          Try Again
        </button>
        <a
          href="/dashboard"
          style={{ padding: "8px 16px", background: "transparent", color: "var(--text-secondary, #a1a1aa)", borderRadius: 8, border: "1px solid var(--border, #27272a)", cursor: "pointer", fontWeight: 600, fontSize: 13, textDecoration: "none" }}
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
