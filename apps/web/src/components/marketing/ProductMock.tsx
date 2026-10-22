import { Type, WandSparkles, ImagePlus, Play, Check, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A static replica of the real editor (same node anatomy, labelled ports and colours) so
 * the hero shows the actual product. Nodes share a top edge, so the port rows line up and
 * the wires between them are exact at every screen width.
 */
export default function ProductMock() {
  return (
    <div className="mock" role="img" aria-label="The NextFlow editor running an Idea → Image workflow: a text idea is enhanced into a detailed prompt, then turned into an image.">
      <div className="mock-bar" aria-hidden="true">
        <div className="mock-dots"><span /><span /><span /></div>
        <div className="mock-title"><span className="mock-logo">⚡</span>Idea → Image<span className="mock-saved"><Check size={11} /> Saved</span></div>
        <div className="mock-run"><Play size={10} fill="currentColor" /> Run</div>
      </div>
      <div className="mock-canvas" aria-hidden="true">
        <div className="mock-row">
          <MockNode accent="#6366f1" icon={<Type size={11} />} title="Your idea" outLabel="Text">
            <div className="mock-field">a cozy reading nook inside a treehouse at golden hour</div>
          </MockNode>
          <div className="mock-link" />
          <MockNode accent="#3b82f6" icon={<WandSparkles size={11} />} title="Enhance Prompt" inLabel="Raw prompt" outLabel="Enhanced">
            <div className="mock-label">Enhanced prompt</div>
            <div className="mock-text"><span>Cozy reading nook in a rustic treehouse, plush armchair, stacked books, floor-to-ceiling windows, golden-hour light, cinematic…</span></div>
          </MockNode>
          <div className="mock-link" />
          <MockNode accent="#f43f5e" icon={<ImagePlus size={11} />} title="Generate Image" inLabel="Prompt" outLabel="Image" outColor="#34d399">
            { }
            <img src="/landing/treehouse.jpg" alt="" className="mock-img" />
            <div className="mock-meta"><span>768 × 432</span><span>Cinematic · 16:9</span></div>
          </MockNode>
        </div>
        <div className="mock-toast"><Sparkles size={12} /> Workflow finished in 16.0s</div>
      </div>
    </div>
  );
}

function MockNode({ accent, icon, title, inLabel, outLabel, outColor = "#818cf8", children }: { accent: string; icon: ReactNode; title: string; inLabel?: string; outLabel: string; outColor?: string; children: ReactNode }) {
  return (
    <div className="mock-node" style={{ ["--a" as string]: accent }}>
      <div className="mock-node-head"><span className="mock-ic">{icon}</span><span className="mock-node-title">{title}</span><Check size={11} className="mock-ok" /></div>
      <div className="mock-ports">
        <span>{inLabel && <><i className="mock-handle mock-handle-in" style={{ background: "#818cf8" }} />{inLabel}</>}</span>
        <span>{outLabel}<i className="mock-handle mock-handle-out" style={{ background: outColor }} /></span>
      </div>
      <div className="mock-body">{children}</div>
    </div>
  );
}
