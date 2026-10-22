"use client";
import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import { WandSparkles } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { Field, LinkedValue, Skeleton, TextResult, useInputSource } from "./parts";

const STYLES = ["Cinematic", "Hyper-Realistic", "Anime", "Artistic", "Product Photography", "Ad Creative"] as const;

export default memo(function PromptEnhancerNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
  const d = data as any;
  const source = useInputSource(id, "prompt");
  const result: string = d.runOutput?.text || "";
  const isRunning = d.runStatus === "running";

  return (
    <BaseNode id={id} type="prompt-enhancer" label={d.label || "Enhance Prompt"} icon={<WandSparkles size={13} />} isRunning={isRunning} runStatus={d.runStatus} runError={d.runError} connectedInputs={d.connectedInputs} selected={selected}>
      <Field label="Rough idea">
        {source ? <LinkedValue from={source} /> : (
          <textarea rows={2} className="node-input nodrag nowheel" placeholder="a cat astronaut" value={d.prompt || ""} onChange={e => updateNodeData(id, { prompt: e.target.value })} />
        )}
      </Field>
      <Field label="Target style">
        <select className="node-input nodrag" value={STYLES.includes(d.style) ? d.style : "Cinematic"} onChange={e => updateNodeData(id, { style: e.target.value })}>
          {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      {isRunning && !result && <Skeleton height={48} label="Writing a detailed prompt…" />}
      {result && !isRunning && <TextResult title="Enhanced prompt" text={result} />}
    </BaseNode>
  );
});
