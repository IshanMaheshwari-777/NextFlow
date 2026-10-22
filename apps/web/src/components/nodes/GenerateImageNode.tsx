"use client";
import { memo, useEffect, useRef, useState } from "react";
import { NodeProps } from "@xyflow/react";
import { ImagePlus, Clock } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { useShallow } from "zustand/react/shallow";
import { Field, LinkedValue, MediaResult, Pills, RunNodeButton, Skeleton, useInputSource } from "./parts";

const STYLES = ["Default", "Cinematic", "Hyper-Realistic", "Anime", "Artistic", "Product Photography"] as const;
const RATIOS = ["1:1", "4:3", "16:9", "9:16"] as const;
/** Pollinations' free tier allows one image every 45 seconds per IP. */
export const IMAGE_COOLDOWN_SECONDS = 45;

export default memo(function GenerateImageNode({ id, data, selected }: NodeProps) {
  const { updateNodeData, cooldownEnd, startCooldown } = useWorkflowStore(
    useShallow(s => ({ updateNodeData: s.updateNodeData, cooldownEnd: s.cooldownEnd, startCooldown: s.startCooldown }))
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
  const d = data as any;
  const promptSource = useInputSource(id, "prompt");
  const imageUrl: string | undefined = d.runOutput?.imageUrl;
  const isGenerating = d.runStatus === "running";
  const ratio = RATIOS.includes(d.aspectRatio) ? d.aspectRatio : "1:1";

  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    const tick = () => setTimeLeft(Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [cooldownEnd]);

  // Start the shared cooldown when a generation finishes (success or failure — both hit the rate limit).
  const prevStatus = useRef(d.runStatus);
  useEffect(() => {
    if (prevStatus.current === "running" && (d.runStatus === "success" || d.runStatus === "failed") && cooldownEnd < Date.now()) {
      startCooldown(IMAGE_COOLDOWN_SECONDS);
    }
    prevStatus.current = d.runStatus;
  }, [d.runStatus, cooldownEnd, startCooldown]);

  const hasPrompt = !!promptSource || !!(d.prompt && String(d.prompt).trim());

  return (
    <BaseNode id={id} type="generate-image" label={d.label || "Generate Image"} icon={<ImagePlus size={13} />} isRunning={isGenerating} runStatus={d.runStatus} runError={d.runError} connectedInputs={d.connectedInputs} selected={selected}>
      <Field label="Prompt">
        {promptSource ? <LinkedValue from={promptSource} /> : (
          <textarea rows={3} className="node-input nodrag nowheel" placeholder="A cozy cabin in a snowy forest at dusk…" value={d.prompt || ""} onChange={e => updateNodeData(id, { prompt: e.target.value })} />
        )}
      </Field>
      <Field label="Style">
        <select className="node-input nodrag" value={STYLES.includes(d.style) ? d.style : "Default"} onChange={e => updateNodeData(id, { style: e.target.value })}>
          {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Aspect ratio">
        <Pills options={RATIOS} value={ratio} onChange={r => updateNodeData(id, { aspectRatio: r })} />
      </Field>

      {isGenerating && <Skeleton height={140} label="Generating — usually 10–30 seconds" />}
      {imageUrl && !isGenerating && (
        <MediaResult title="Result" url={imageUrl} kind="image" filename="generated-image.jpg" meta={d.runOutput?.width ? `${d.runOutput.width} × ${d.runOutput.height}` : undefined} />
      )}

      {timeLeft > 0 && !isGenerating ? (
        <div className="cooldown" title="The free image service limits how often you can generate">
          <Clock size={12} /> Next image available in {timeLeft}s
        </div>
      ) : (
        <RunNodeButton nodeId={id} label={imageUrl ? "Regenerate" : "Generate"} running={isGenerating} disabled={!hasPrompt} disabledReason="Add a prompt first" />
      )}
    </BaseNode>
  );
});
