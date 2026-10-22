import Link from "next/link";
import { Zap, Check } from "lucide-react";
import type { ReactNode } from "react";
import ProductMock from "@/components/marketing/ProductMock";
import "../landing.css";

const BENEFITS = [
  "Ready-to-run templates the moment you sign in",
  "Text, vision, image and video nodes on one canvas",
  "Every run saved with outputs and timings",
];

/** Shared chrome for sign-in / sign-up: form on the left, the product on the right. */
export default function AuthShell({ title, subtitle, switchText, switchHref, switchLabel, children }: { title: string; subtitle: string; switchText: string; switchHref: string; switchLabel: string; children: ReactNode }) {
  return (
    <div className="lp auth-split">
      <section className="auth-form-side">
        <header className="auth-top">
          <Link href="/" className="lp-logo"><span className="lp-logo-mark"><Zap size={13} fill="currentColor" /></span>NextFlow</Link>
          <span className="auth-switch">{switchText} <Link href={switchHref}>{switchLabel}</Link></span>
        </header>
        <div className="auth-form-wrap">
          <h1 className="auth-title">{title}</h1>
          <p className="auth-sub">{subtitle}</p>
          <div className="auth-clerk">{children}</div>
        </div>
        <footer className="auth-legal">© {new Date().getFullYear()} NextFlow</footer>
      </section>
      <aside className="auth-visual-side" aria-hidden="true">
        <div className="lp-hero-glow" />
        <div className="auth-visual-inner">
          <p className="lp-eyebrow" style={{ marginBottom: 10 }}>The visual canvas for AI pipelines</p>
          <h2 className="auth-visual-title">From idea to output in one click.</h2>
          <ul className="auth-benefits">{BENEFITS.map(b => <li key={b}><Check size={14} /> {b}</li>)}</ul>
          <div className="auth-mock"><ProductMock /></div>
        </div>
      </aside>
    </div>
  );
}

/** Clerk theming via its supported appearance API (no structural CSS that breaks on Clerk updates). */
export const clerkAppearance = {
  variables: {
    colorBackground: "#0e0e12",
    colorInputBackground: "#15151b",
    colorInputText: "#f5f5f7",
    colorPrimary: "#ffffff",
    colorTextOnPrimaryBackground: "#050505",
    colorText: "#f5f5f7",
    colorTextSecondary: "rgba(245,245,247,0.62)",
    colorNeutral: "#f5f5f7",
    borderRadius: "10px",
    fontSize: "14px",
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", maxWidth: "100%", boxShadow: "none", border: "none", background: "transparent" },
    card: { background: "transparent", boxShadow: "none", border: "none", padding: 0 },
    header: { display: "none" },
    footer: { background: "transparent", marginTop: 8 },
    formButtonPrimary: { height: 42, fontSize: 14, fontWeight: 600, boxShadow: "none" },
    socialButtonsBlockButton: { height: 42, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.02)" },
    formFieldInput: { height: 42, border: "1px solid rgba(255,255,255,0.12)" },
  },
};
