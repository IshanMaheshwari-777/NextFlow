"use client";
import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import { Film } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { Field, LinkedValue, MediaResult, Skeleton, useInputSource } from "./parts";

export default memo(function ExtractFrameNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
  const d = data as any;
  const source = useInputSource(id, "video_url");
  const outputUrl: unknown = d.runOutput?.imageUrl || d.runOutput?.output;
  const hasOutput = typeof outputUrl === "string" && outputUrl.startsWith("http");

  return (
    <BaseNode id={id} type="extract-frame" label={d.label || "Extract Frame"} icon={<Film size={13} />} isRunning={d.isRunning} runStatus={d.runStatus} runError={d.runError} connectedInputs={d.connectedInputs} selected={selected}>
      <Field label="Video">
        {source ? <LinkedValue from={source} /> : (
          <input type="url" className="node-input nodrag" placeholder="https://… or connect a video" value={d.video_url || ""} onChange={e => updateNodeData(id, { video_url: e.target.value })} />
        )}
      </Field>
      <Field label="Timestamp" hint="Seconds from the start of the video">
        <div className="input-suffix">
          <input type="number" min={0} step={0.1} className="node-input nodrag" value={d.timestamp ?? 0} onChange={e => updateNodeData(id, { timestamp: Math.max(0, Number(e.target.value) || 0) })} />
          <span>sec</span>
        </div>
      </Field>
      {d.isRunning && <Skeleton height={110} />}
      {hasOutput && !d.isRunning && (
        <MediaResult title="Extracted frame" url={outputUrl as string} kind="image" filename="extracted-frame.jpg"
          meta={d.runOutput?.width && d.runOutput?.height ? `${d.runOutput.width} × ${d.runOutput.height}` : undefined} />
      )}
    </BaseNode>
  );
});
