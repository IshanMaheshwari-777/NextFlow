import Link from "next/link";
import {
  ArrowRight, Zap, Sparkles, Layers, Eye, History, Workflow, ShieldCheck, MousePointerClick, Cable, Play,
  ChevronDown, ImageIcon, Film, type LucideIcon,
} from "lucide-react";
import * as Icons from "lucide-react";
import { SIDEBAR_NODES, NODE_HANDLES } from "@nextflow/shared/types";
import ProductMock from "@/components/marketing/ProductMock";
import "@/app/landing.css";

const iconMap = Icons as unknown as Record<string, LucideIcon>;

type Visual = "wires" | "parallel" | "ai" | "history" | "vision" | "rerun";
// Three rows of wide + narrow (alternating sides) so the bento grid never leaves an orphan.
const FEATURES: { icon: LucideIcon; title: string; body: string; wide?: boolean; visual?: Visual }[] = [
  { icon: Workflow, title: "A canvas that explains itself", body: "Every port is labelled and colour-coded by what flows through it — text, image or video. Wrong connections are refused with a reason, not a silent failure.", wide: true, visual: "wires" },
  { icon: Sparkles, title: "Describe it, get a workflow", body: "Type what you want in plain English. AI picks the nodes, wires them up and lays them out.", visual: "ai" },
  { icon: Layers, title: "Runs in parallel, in the cloud", body: "Independent branches execute at the same time on background workers — close the tab, the run keeps going.", visual: "parallel" },
  { icon: History, title: "Every run, recorded", body: "Per-node status, timing and output for every run, so you can see exactly what happened and where.", wide: true, visual: "history" },
  { icon: Eye, title: "Vision built in", body: "Connect an image to an LLM and it switches to a vision model automatically — describe products, caption frames, extract details.", wide: true, visual: "vision" },
  { icon: MousePointerClick, title: "Run one node at a time", body: "Tweak a prompt and re-run just that step. Upstream results are reused, so iteration is fast.", visual: "rerun" },
];

const STEPS = [
  { icon: MousePointerClick, title: "Add nodes", body: "Start from a template, describe a workflow to AI, or press N to pick from nine building blocks." },
  { icon: Cable, title: "Connect them", body: "Drag from an output to an input. Ports only accept the right kind of data, so pipelines just work." },
  { icon: Play, title: "Press Run", body: "Watch each step light up as it finishes, then download images, copy text, or tweak and re-run." },
];

const FAQ = [
  { q: "Do I need to write any code?", a: "No. Everything happens on the canvas — add nodes, connect them, and press Run. You can export any workflow as JSON if you want to version it." },
  { q: "Which AI models does it use?", a: "Text and vision run on Groq (GPT-OSS 20B / 120B and Qwen vision). Images are generated with Pollinations. Image and video processing — cropping, frame extraction, upscaling — runs on Transloadit." },
  { q: "What happens if a step fails?", a: "The failing node turns red with a plain-language error, the rest of the workflow keeps whatever it already finished, and the run is saved to history so you can fix the input and re-run just that node." },
  { q: "Is my work saved?", a: "Yes. Workflows autosave as you edit, and every run is stored with its outputs and timings." },
  { q: "Is it free?", a: "Yes — sign up and start building. Free image generation is rate-limited to roughly one image every 45 seconds." },
];

const POWERED_BY = ["Groq", "Trigger.dev", "Transloadit", "Pollinations", "Clerk", "Postgres"];

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link href="/" className="lp-logo" aria-label="NextFlow home"><span className="lp-logo-mark"><Zap size={13} fill="currentColor" /></span>NextFlow</Link>
          <nav className="lp-nav-links" aria-label="Primary">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#templates">Templates</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="lp-nav-cta">
            <Link href="/sign-in" className="lp-link">Log in</Link>
            <Link href="/sign-up" className="lp-btn lp-btn-primary lp-btn-sm">Get started</Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-hero-glow" aria-hidden="true" />
          <div className="lp-container lp-hero-copy">
            <Link href="/sign-up" className="lp-pill"><span className="lp-pill-tag">New</span> Describe a workflow — AI builds it <ArrowRight size={13} /></Link>
            <h1>The visual canvas for <span className="lp-gradient-text">AI&nbsp;pipelines</span></h1>
            <p className="lp-lede">Chain LLMs, image generation and video processing into workflows you can run with one click. No glue code, no waiting on a terminal.</p>
            <div className="lp-hero-ctas">
              <Link href="/sign-up" className="lp-btn lp-btn-primary">Start building — it&apos;s free <ArrowRight size={16} /></Link>
              <a href="#how" className="lp-btn lp-btn-ghost">See how it works</a>
            </div>
            <p className="lp-fineprint"><ShieldCheck size={13} /> No credit card · Ready-to-run templates · Works in your browser</p>
          </div>
          <div className="lp-container lp-hero-visual">
            <ProductMock />
          </div>
        </section>

        {/* Powered by */}
        <section className="lp-container lp-powered" aria-label="Powered by">
          <span>Powered by</span>
          <ul>{POWERED_BY.map(p => <li key={p}>{p}</li>)}</ul>
        </section>

        {/* Features */}
        <section id="features" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-eyebrow">Features</span>
              <h2>Everything you need to go from idea to output</h2>
              <p>Designed so the first run works — and the hundredth is just as clear.</p>
            </div>
            <div className="lp-bento">
              {FEATURES.map(f => (
                <article key={f.title} className={`lp-card ${f.wide ? "lp-card-wide" : ""}`}>
                  {f.visual && <FeatureVisual kind={f.visual} />}
                  <div className="lp-card-icon"><f.icon size={16} /></div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-eyebrow">How it works</span>
              <h2>Three steps. One click to run.</h2>
            </div>
            <ol className="lp-steps">
              {STEPS.map((s, i) => (
                <li key={s.title} className="lp-step">
                  <div className="lp-step-num">{i + 1}</div>
                  <div className="lp-step-icon"><s.icon size={18} /></div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-eyebrow">Templates</span>
              <h2>Start from something that already works</h2>
              <p>Every account comes with templates you can run immediately and adapt.</p>
            </div>
            <div className="lp-templates">
              <TemplateCard icon={Sparkles} name="Idea → Image" badge="Zero setup" body="Turn a one-line idea into a detailed, cinematic prompt and a generated image." chain={[["Text", "#6366f1"], ["Enhance Prompt", "#3b82f6"], ["Generate Image", "#f43f5e"]]} />
              <TemplateCard icon={ImageIcon} name="Product Marketing Kit" badge="Image + video" body="Crop a product photo, grab a frame from a demo video, and write launch copy for both with vision AI." chain={[["Upload", "#10b981"], ["Crop", "#ef4444"], ["Vision LLM", "#a78bfa"]]} />
              <TemplateCard icon={Film} name="Video → Caption" badge="Build it in 30s" body="Extract a frame at any timestamp and have an LLM describe or caption it — a great first workflow to build yourself." chain={[["Upload Video", "#f59e0b"], ["Extract Frame", "#ec4899"], ["Vision LLM", "#a78bfa"]]} />
            </div>
          </div>
        </section>

        {/* Node catalog */}
        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-eyebrow">Building blocks</span>
              <h2>{SIDEBAR_NODES.length} nodes that snap together</h2>
            </div>
            <div className="lp-nodes">
              {SIDEBAR_NODES.map(n => {
                const Icon = iconMap[n.icon];
                const io = NODE_HANDLES[n.type];
                const ins = [...new Set(io.inputs.map(h => h.type))];
                return (
                  <div key={n.type} className="lp-node">
                    <span className="lp-node-icon" style={{ color: n.color, background: `${n.color}1a`, borderColor: `${n.color}40` }}>{Icon && <Icon size={16} />}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong>{n.label}</strong>
                      <small>{n.description}</small>
                    </div>
                    <span className="lp-node-io">{ins.length ? ins.join(" + ") : "input"} → {io.outputs[0]?.type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="lp-section">
          <div className="lp-container lp-faq-wrap">
            <div className="lp-section-head lp-section-head-left">
              <span className="lp-eyebrow">FAQ</span>
              <h2>Questions, answered</h2>
            </div>
            <div className="lp-faq">
              {FAQ.map(f => (
                <details key={f.q}>
                  <summary>{f.q}<ChevronDown size={16} /></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="lp-container lp-final">
          <div className="lp-final-card">
            <h2>Build your first AI workflow in under a minute.</h2>
            <p>Sign up, open the ready-made template, press Run.</p>
            <Link href="/sign-up" className="lp-btn lp-btn-primary">Create a free account <ArrowRight size={16} /></Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div>
            <Link href="/" className="lp-logo"><span className="lp-logo-mark"><Zap size={13} fill="currentColor" /></span>NextFlow</Link>
            <p>The visual canvas for AI pipelines.</p>
          </div>
          <div className="lp-footer-cols">
            <div><h4>Product</h4><a href="#features">Features</a><a href="#templates">Templates</a><a href="#faq">FAQ</a></div>
            <div><h4>Account</h4><Link href="/sign-up">Sign up</Link><Link href="/sign-in">Log in</Link></div>
          </div>
        </div>
        <div className="lp-container lp-footer-bottom">© {new Date().getFullYear()} NextFlow</div>
      </footer>
    </div>
  );
}

function TemplateCard({ icon: Icon, name, badge, body, chain }: { icon: LucideIcon; name: string; badge: string; body: string; chain: [string, string][] }) {
  return (
    <article className="lp-card lp-template">
      <div className="lp-template-top"><div className="lp-card-icon"><Icon size={16} /></div><span className="lp-badge">{badge}</span></div>
      <h3>{name}</h3>
      <p>{body}</p>
      <div className="lp-chain">
        {chain.map(([label, color], i) => (
          <span key={label} style={{ display: "contents" }}>
            <span className="lp-chain-node" style={{ ["--c" as string]: color }}>{label}</span>
            {i < chain.length - 1 && <span className="lp-chain-wire" />}
          </span>
        ))}
      </div>
    </article>
  );
}

function FeatureVisual({ kind }: { kind: Visual }) {
  if (kind === "wires") {
    return (
      <div className="fv fv-wires" aria-hidden="true">
        {[["Text", "#818cf8"], ["Image", "#34d399"], ["Video", "#fbbf24"]].map(([l, c]) => (
          <div key={l} className="fv-wire-row"><span className="fv-port" style={{ background: c }} /><span className="fv-line" style={{ background: c }} /><span className="fv-port" style={{ background: c }} /><span className="fv-wire-label">{l}</span></div>
        ))}
        <div className="fv-refuse">“Images” needs an image, but “Text” is text.</div>
      </div>
    );
  }
  if (kind === "history") {
    const rows: [string, string, string, string][] = [["Run #12", "success", "Full run · 3 nodes", "16.0s"], ["Run #11", "partial", "Full run · 6 nodes · 1 failed", "24.1s"], ["Run #10", "success", "Single node", "5.1s"]];
    return (
      <div className="fv fv-history" aria-hidden="true">
        {rows.map(([name, status, meta, time]) => (
          <div key={name} className="fv-run"><span className={`fv-dot fv-${status}`} /><strong>{name}</strong><span className={`fv-badge fv-${status}`}>{status}</span><span className="fv-run-meta">{meta}</span><span className="fv-run-time">{time}</span></div>
        ))}
      </div>
    );
  }
  if (kind === "vision") {
    return (
      <div className="fv fv-vision" aria-hidden="true">
        { }
        <img src="/landing/treehouse.jpg" alt="" />
        <span className="fv-arrow" />
        <span className="fv-chips"><span style={{ ["--c" as string]: "#a78bfa" }}>Qwen Vision</span></span>
        <span className="fv-arrow" />
        <p>“A sunlit treehouse reading nook with a cushioned lounge chair, wooden walls and a window onto dense green forest.”</p>
      </div>
    );
  }
  if (kind === "rerun") {
    return (
      <div className="fv fv-rerun" aria-hidden="true">
        <div className="fv-rr-row fv-rr-reused"><span className="fv-dot fv-success" />Your idea<span className="fv-rr-tag">reused</span></div>
        <div className="fv-rr-row fv-rr-active"><span className="fv-rr-spin" />Enhance Prompt<span className="fv-rr-btn">▶ Run node</span></div>
      </div>
    );
  }
  if (kind === "parallel") {
    return (
      <div className="fv fv-parallel" aria-hidden="true">
        {[78, 52, 94].map((w, i) => <div key={i} className="fv-bar"><span style={{ width: `${w}%`, animationDelay: `${i * 0.35}s` }} /></div>)}
      </div>
    );
  }
  return (
    <div className="fv fv-ai" aria-hidden="true">
      <div className="fv-prompt">“Enhance my prompt, then generate an image”<span className="fv-caret" /></div>
      <div className="fv-chips"><span style={{ ["--c" as string]: "#6366f1" }}>Text</span><span style={{ ["--c" as string]: "#3b82f6" }}>Enhance</span><span style={{ ["--c" as string]: "#f43f5e" }}>Image</span></div>
    </div>
  );
}
