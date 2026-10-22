import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Zap, ArrowRight, MousePointerClick, Cable, Play, type LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { SIDEBAR_NODES } from "@nextflow/shared/types";

const iconMap = Icons as unknown as Record<string, LucideIcon>;

const STEPS = [
  { icon: MousePointerClick, title: "Drop in nodes", body: "Text, uploads, LLMs, image generation, cropping, frame extraction, video enhancement." },
  { icon: Cable, title: "Wire them together", body: "Connect outputs to inputs. Colour-coded ports only accept the right kind of data." },
  { icon: Play, title: "Run with one click", body: "Steps run in parallel in the background, with live status and a full history of every run." },
];

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="landing">
      <header className="landing-header">
        <Link href="/" className="auth-logo"><Zap size={18} fill="currentColor" /> NextFlow</Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/sign-in" className="landing-link">Log in</Link>
          <Link href="/sign-up" className="landing-btn landing-btn-light">Sign up free</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <span className="landing-eyebrow">Visual AI workflow builder</span>
        <h1>Build AI pipelines<br /><span style={{ color: "#8a8a8e" }}>without writing glue code.</span></h1>
        <p>Drag nodes onto a canvas, connect them, and run. Generate and enhance images, process video, and chain LLM prompts — all in one place.</p>
        <div className="landing-ctas">
          <Link href="/sign-up" className="landing-btn landing-btn-light landing-btn-lg">Start building free <ArrowRight size={16} /></Link>
          <Link href="/sign-in" className="landing-btn landing-btn-ghost landing-btn-lg">I have an account</Link>
        </div>
      </section>

      <section className="landing-section">
        <h2>How it works</h2>
        <div className="landing-steps">
          {STEPS.map((s, i) => (
            <div key={s.title} className="landing-card">
              <span className="landing-step-num">{i + 1}</span>
              <s.icon size={18} />
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2>{SIDEBAR_NODES.length} building blocks, ready to connect</h2>
        <div className="landing-nodes">
          {SIDEBAR_NODES.map(n => {
            const Icon = iconMap[n.icon];
            return (
              <div key={n.type} className="landing-node">
                <span className="landing-node-icon" style={{ color: n.color, background: `${n.color}1f`, borderColor: `${n.color}40` }}>{Icon && <Icon size={16} />}</span>
                <span><strong>{n.label}</strong><small>{n.description}</small></span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="landing-final">
        <h2>Your first workflow is one click away.</h2>
        <p>Every new account starts with a ready-to-run template.</p>
        <Link href="/sign-up" className="landing-btn landing-btn-light landing-btn-lg">Create a free account <ArrowRight size={16} /></Link>
      </section>

      <footer className="landing-footer">© {new Date().getFullYear()} NextFlow · Built with Next.js, React Flow &amp; Trigger.dev</footer>
    </div>
  );
}
