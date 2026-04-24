"use client";
import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import { Film } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";

export default memo(function ExtractFrameNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useWorkflowStore();
  const d = data as any;
  const connected: string[] = d.connectedInputs || [];
  const isConnected = connected.includes("video_url");
  return (
    <BaseNode id={id} type="extract-frame" label={d.label || "Extract Frame"} accentColor="#ec4899" icon={<Film className="w-3.5 h-3.5" />} isRunning={d.isRunning} runStatus={d.runStatus} selected={selected}>
      <div className="space-y-1">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">Video URL {isConnected && <span className="text-pink-400 text-[9px]">← connected</span>}</label>
        <input type="url" className="node-input" placeholder="https://..." value={d.video_url || ""} disabled={isConnected} data-connected={isConnected} onChange={e => updateNodeData(id, { video_url: e.target.value })} />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Timestamp (seconds)</label>
        <input type="number" min="0" step="0.1" className="node-input" placeholder="0" value={d.timestamp ?? 0} onChange={e => updateNodeData(id, { timestamp: Number(e.target.value) || 0 })} />
      </div>
      {d.runOutput?.imageUrl && <div><p className="text-[10px] text-zinc-500 mb-1">Extracted frame:</p><img src={d.runOutput.imageUrl} alt="frame" className="max-w-full max-h-40 object-contain rounded-lg border border-white/[0.06]" />{(d.runOutput.width || d.runOutput.height) && <p className="text-xs text-zinc-400 mt-1">{d.runOutput.width} × {d.runOutput.height}</p>}</div>}
      {d.runError && <p className="text-[10px] text-red-400 bg-red-500/10 rounded-lg px-2.5 py-1.5 border border-red-500/20">{d.runError}</p>}
    </BaseNode>
  );
});
