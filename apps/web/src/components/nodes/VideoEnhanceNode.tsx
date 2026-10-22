"use client";
import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import { Clapperboard } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { Field, LinkedValue, MediaResult, Pills, Skeleton, useInputSource } from "./parts";

const RESOLUTIONS = ["720p", "1080p", "4K"] as const;
const STRENGTHS = ["light", "medium", "strong"] as const;

export default memo(function VideoEnhanceNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
  const d = data as any;
  const source = useInputSource(id, "video_url");
  const outputUrl: unknown = d.runOutput?.videoUrl || d.runOutput?.output;
  const hasOutput = typeof outputUrl === "string" && outputUrl.startsWith("http");
  const isRunning = d.runStatus === "running";
  const resolution = RESOLUTIONS.includes(d.resolution) ? d.resolution : "1080p";
  const strength = STRENGTHS.includes(d.strength) ? d.strength : "medium";

  return (
    <BaseNode id={id} type="video-enhance" label={d.label || "Video Enhance"} icon={<Clapperboard size={13} />} isRunning={isRunning} runStatus={d.runStatus} runError={d.runError} connectedInputs={d.connectedInputs} selected={selected}>
      <Field label="Video">
        {source ? <LinkedValue from={source} /> : (
          <input type="url" className="node-input nodrag" placeholder="https://… or connect a video" value={d.video_url || ""} onChange={e => updateNodeData(id, { video_url: e.target.value })} />
        )}
      </Field>
      <Field label="Output resolution">
        <Pills options={RESOLUTIONS} value={resolution} onChange={r => updateNodeData(id, { resolution: r })} />
      </Field>
      <Field label="Enhancement" hint="Upscale · denoise · sharpen · colour boost">
        <Pills options={STRENGTHS} value={strength} onChange={s => updateNodeData(id, { strength: s })} format={s => s[0].toUpperCase() + s.slice(1)} />
      </Field>
      {isRunning && <Skeleton height={72} label="Enhancing — 1–3 minutes depending on length" />}
      {hasOutput && !isRunning && (
        <MediaResult title="Enhanced video" url={outputUrl as string} kind="video" filename="enhanced-video.mp4" meta={`${d.runOutput?.resolution || resolution} · ${d.runOutput?.strength || strength}`} />
      )}
    </BaseNode>
  );
});
