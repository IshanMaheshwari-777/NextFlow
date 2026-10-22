import Link from "next/link";
import { Zap } from "lucide-react";
import type { ReactNode } from "react";

/** Shared chrome for the sign-in / sign-up pages (they were two copy-pasted 150-line files). */
export default function AuthShell({ title, subtitle, switchText, switchHref, switchLabel, children }: { title: string; subtitle: string; switchText: string; switchHref: string; switchLabel: string; children: ReactNode }) {
  return (
    <div className="auth-page">
      <nav className="auth-nav">
        <Link href="/" className="auth-logo"><Zap size={18} fill="currentColor" /> NextFlow</Link>
        <span className="auth-switch">{switchText} <Link href={switchHref}>{switchLabel}</Link></span>
      </nav>
      <main className="auth-main">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-sub">{subtitle}</p>
        </div>
        <div className="auth-force-dark">{children}</div>
      </main>
    </div>
  );
}

export const clerkAppearance = {
  variables: {
    colorBackground: "rgba(12, 12, 14, 0.72)",
    colorInputBackground: "rgba(255, 255, 255, 0.05)",
    colorInputText: "#ffffff",
    colorPrimary: "#ffffff",
    colorTextOnPrimaryBackground: "#000000",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.7)",
    borderRadius: "10px",
  },
  elements: {
    // Our page already shows the title; Clerk's footer keeps the sign-up/sign-in switch link.
    header: { display: "none" },
    cardBox: "custom-auth-card-box",
    card: "custom-auth-card",
  },
};
