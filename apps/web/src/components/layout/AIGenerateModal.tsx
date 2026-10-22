"use client";
import { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { NODE_HANDLES, NodeType, HANDLE_COMPAT, HANDLE_COLORS, AppNode, AppEdge } from "@nextflow/shared/types";
import { defaultNodeData } from "@/lib/nodeRegistry";
import { wouldCreateCycle } from "@nextflow/shared/graph";
import { topologicalSort } from "@nextflow/shared/workflowExecution";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- LLM-generated node data, shape unknown until merged with type defaults
type RawNode = { id: string; type: string; position?: { x: number; y: number }; data?: Record<string, any> };
type RawEdge = { id?: string; source: string; target: string; sourceHandle?: string; targetHandle?: string };

const EXAMPLES = [
  "Turn a rough idea into a detailed prompt, then generate an image from it",
  "Describe an uploaded product photo and write a launch tweet about it",
  "Grab a frame from a video and have an LLM caption it",
];

const HANDLE_ALIASES: Record<string, string> = {
  image_url: "imageUrl", image: "imageUrl", input_image: "imageUrl",
  video: "video_url", input_video: "video_url",
  input: "prompt", text: "prompt", input_text: "user_message",
  message: "user_message", system: "system_prompt",
  out: "output", result: "output",
};

export default function AIGenerateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/workflow/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt.trim() }) });
      const data: { nodes?: RawNode[]; edges?: RawEdge[]; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Generation failed (${res.status})`);
      const added = applyGenerated(data.nodes ?? [], data.edges ?? []);
      if (added === 0) throw new Error("The AI didn't return any usable nodes. Try describing the steps more concretely.");
      toast.success(`Added ${added} node${added > 1 ? "s" : ""}. Fill in the inputs, then press Run.`);
      window.dispatchEvent(new Event("canvas-fit-view"));
      setPrompt(""); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={() => { if (!loading) onClose(); }} title="Generate a workflow with AI" subtitle="Describe what you want — AI picks the nodes and wires them up." width={520}>
      <div className="modal-body">
        <textarea
          data-autofocus
          className="text-area"
          rows={4}
          maxLength={1500}
          placeholder="e.g. Enhance my prompt, generate an image, then crop it to a square"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.stopPropagation(); handleGenerate(); } }}
          disabled={loading}
        />
        <div className="chip-row">
          {EXAMPLES.map(ex => <button key={ex} type="button" className="chip" onClick={() => setPrompt(ex)} disabled={loading}>{ex}</button>)}
        </div>
        {error && <p className="field-error" role="alert"><AlertCircle size={12} /> {error}</p>}
      </div>
      <div className="modal-footer">
        <span className="field-hint" style={{ margin: 0 }}>⌘ Enter to generate</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading || !prompt.trim()}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Validates the LLM's graph against real handle definitions, lays it out, and appends it to the canvas. */
function applyGenerated(rawNodes: RawNode[], rawEdges: RawEdge[]): number {
  const store = useWorkflowStore.getState();
  const { nodes, edges } = store;
  const idMap = new Map<string, string>();

  const mapped: AppNode[] = rawNodes.filter(n => n && NODE_HANDLES[n.type as NodeType]).map(n => {
    const type = n.type as NodeType;
    const id = `${type}-${Math.random().toString(36).slice(2, 10)}`;
    idMap.set(n.id, id);
    const defaults = defaultNodeData(type);
    // Only accept known string fields from the model — never arbitrary run state.
    const safe = Object.fromEntries(Object.entries(n.data ?? {}).filter(([k, v]) => typeof v === "string" && (k in defaults || k === "label")));
    return { id, type, position: { x: 0, y: 0 }, data: { ...defaults, ...safe, label: (n.data?.label as string) || defaults.label, runStatus: "idle", connectedInputs: [] } };
  });

  const newEdges: AppEdge[] = [];
  for (const e of rawEdges) {
    const source = idMap.get(e?.source), target = idMap.get(e?.target);
    if (!source || !target) continue;
    const src = mapped.find(n => n.id === source)!, tgt = mapped.find(n => n.id === target)!;
    const srcDefs = NODE_HANDLES[src.type as NodeType], tgtDefs = NODE_HANDLES[tgt.type as NodeType];
    if (srcDefs.outputs.length === 0 || tgtDefs.inputs.length === 0) continue;
    const srcHandle = srcDefs.outputs[0];
    let tgtId = HANDLE_ALIASES[e.targetHandle ?? ""] || e.targetHandle || "";
    let tgtHandle = tgtDefs.inputs.find(h => h.id === tgtId);
    if (!tgtHandle || !HANDLE_COMPAT[srcHandle.type].includes(tgtHandle.type)) {
      tgtHandle = tgtDefs.inputs.find(h => HANDLE_COMPAT[srcHandle.type].includes(h.type) && !newEdges.some(x => x.target === target && x.targetHandle === h.id));
      if (!tgtHandle) continue;
      tgtId = tgtHandle.id;
    }
    if (tgtId !== "images" && newEdges.some(x => x.target === target && x.targetHandle === tgtId)) continue;
    if (wouldCreateCycle(newEdges, source, target)) continue;
    newEdges.push({ id: `e-${source}-output-${target}-${tgtId}`, source, sourceHandle: srcHandle.id, target, targetHandle: tgtId, animated: false, style: { stroke: HANDLE_COLORS[srcHandle.type], strokeWidth: 2 } });
  }

  // Lay out left→right by dependency depth, to the right of anything already on the canvas.
  const offsetX = nodes.length ? Math.max(...nodes.map(n => n.position.x)) + 420 : 80;
  const layers = topologicalSort(mapped, newEdges);
  layers.forEach((layer, li) => layer.forEach((n, ni) => {
    const node = mapped.find(m => m.id === n.id)!;
    node.position = { x: offsetX + li * 360, y: 80 + ni * 320 };
  }));

  if (mapped.length) {
    store.saveSnapshot();
    store.setGraph([...nodes, ...mapped], [...edges, ...newEdges]);
  }
  return mapped.length;
}
