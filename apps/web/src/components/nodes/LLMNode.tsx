"use client";
import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import { Sparkles, Eye } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { GROQ_MODELS, GROQ_DEFAULT_TEXT_MODEL } from "@nextflow/shared/types";
import { Field, LinkedValue, Skeleton, TextResult, useInputSource } from "./parts";

const MODEL_IDS = new Set<string>(GROQ_MODELS.map(m => m.id));

export default memo(function LLMNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
  const d = data as any;
  const connected: string[] = d.connectedInputs || [];
  const systemSource = useInputSource(id, "system_prompt");
  const userSource = useInputSource(id, "user_message");
  const imageCount = useWorkflowStore(s => s.edges.filter(e => e.target === id && e.targetHandle === "images").length);
  // Retired model ids (e.g. qwen3.6) fall back to the default instead of showing a blank select.
  const model = MODEL_IDS.has(d.model) ? d.model : GROQ_DEFAULT_TEXT_MODEL;
  const result: string | undefined = d.result || d.runOutput?.text;

  return (
    <BaseNode id={id} type="llm" label={d.label || "Run LLM"} icon={<Sparkles size={13} />} isRunning={d.isRunning} runStatus={d.runStatus} runError={d.runError} connectedInputs={connected} selected={selected}>
      <Field label="Model">
        {imageCount > 0 ? (
          <div className="linked-value"><Eye size={12} /><span>Qwen Vision — auto-selected for {imageCount} image{imageCount > 1 ? "s" : ""}</span></div>
        ) : (
          <select className="node-input nodrag" value={model} onChange={e => updateNodeData(id, { model: e.target.value })}>
            {GROQ_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        )}
      </Field>
      <Field label="System prompt" right={<span className="field-optional">optional</span>}>
        {systemSource ? <LinkedValue from={systemSource} /> : (
          <textarea className="node-input nodrag nowheel" rows={2} placeholder="You are a helpful assistant…" value={d.system_prompt || ""} onChange={e => updateNodeData(id, { system_prompt: e.target.value })} />
        )}
      </Field>
      <Field label="User message">
        {userSource ? <LinkedValue from={userSource} /> : (
          <textarea className="node-input nodrag nowheel" rows={3} placeholder={imageCount > 0 ? "Describe this image… (optional)" : "Ask anything…"} value={d.user_message || ""} onChange={e => updateNodeData(id, { user_message: e.target.value })} />
        )}
      </Field>
      {d.isRunning && !result && <Skeleton height={64} label="Thinking…" />}
      {result && <TextResult title="Response" text={result} />}
    </BaseNode>
  );
});
