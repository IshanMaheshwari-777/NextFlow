"use client";
import { useEffect } from "react";

// Catches errors thrown by the root layout itself — must render its own <html>/<body>
// since it replaces everything, including globals.css's provider tree.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{
          height: "100vh", width: "100vw", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16,
          background: "#09090b", color: "#fafafa", padding: "2rem", textAlign: "center",
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>NextFlow hit an unexpected error</h2>
          <p style={{ margin: 0, color: "#a1a1aa", fontSize: 14, maxWidth: 420 }}>
            The application failed to load. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{ padding: "8px 16px", background: "#fafafa", color: "#09090b", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
