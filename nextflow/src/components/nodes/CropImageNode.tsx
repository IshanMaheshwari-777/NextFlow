"use client";
import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import { Crop } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";

export default memo(function CropImageNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useWorkflowStore();
  const d = data as any;
  const connected: string[] = d.connectedInputs || [];
  const isConnected = connected.includes("imageUrl") || connected.includes("image_url");
  return (
    <BaseNode id={id} type="crop-image" label={d.label || "Crop Image"} accentColor="#ef4444" icon={<Crop className="w-3.5 h-3.5" />} isRunning={d.isRunning} runStatus={d.runStatus} selected={selected}>
      <div className="space-y-1">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">Image URL {isConnected && <span className="text-red-400 text-[9px]">← connected</span>}</label>
        <input type="url" className="node-input" placeholder="https://..." value={d.imageUrl || d.image_url || ""} disabled={isConnected} data-connected={isConnected} onChange={e => updateNodeData(id, { imageUrl: e.target.value })} />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Crop Region (%)</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[["X%", "x_percent"], ["Y%", "y_percent"], ["Width%", "width_percent"], ["Height%", "height_percent"]].map(([lbl, key]) => (
            <div key={key} className="space-y-0.5">
              <label className="text-[9px] text-zinc-600">{lbl}</label>
              <input type="number" min={0} max={100} className="node-input text-center" value={d[key] ?? (key.includes("width") || key.includes("height") ? 100 : 0)} onChange={e => updateNodeData(id, { [key]: Math.min(100, Math.max(0, Number(e.target.value))) })} />
            </div>
          ))}
        </div>
      </div>
      {d.runOutput?.imageUrl && (
        <div className="space-y-1">
          <img src={d.runOutput.imageUrl} alt="cropped" className="max-w-full max-h-40 object-contain rounded border border-[#2a2a2a]" />
          {(d.runOutput.width || d.runOutput.height) && (
            <p className="text-xs text-zinc-400">{d.runOutput.width} × {d.runOutput.height}</p>
          )}
        </div>
      )}
      {d.runError && <p className="text-[10px] text-red-400 bg-red-500/10 rounded px-2 py-1">{d.runError}</p>}
    </BaseNode>
  );
});
