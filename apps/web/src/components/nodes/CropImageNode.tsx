"use client";
import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import { Crop } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { Field, LinkedValue, MediaResult, Skeleton, useInputSource } from "./parts";

const KEYS = [["X", "x_percent", 0], ["Y", "y_percent", 0], ["Width", "width_percent", 100], ["Height", "height_percent", 100]] as const;

export default memo(function CropImageNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
  const d = data as any;
  const source = useInputSource(id, "imageUrl");
  const outputUrl: unknown = d.runOutput?.imageUrl || d.runOutput?.output;
  const hasOutput = typeof outputUrl === "string" && outputUrl.startsWith("http");
  const x = Number(d.x_percent ?? 0), y = Number(d.y_percent ?? 0), w = Number(d.width_percent ?? 100), h = Number(d.height_percent ?? 100);

  return (
    <BaseNode id={id} type="crop-image" label={d.label || "Crop Image"} icon={<Crop size={13} />} isRunning={d.isRunning} runStatus={d.runStatus} runError={d.runError} connectedInputs={d.connectedInputs} selected={selected}>
      <Field label="Image">
        {source ? <LinkedValue from={source} /> : (
          <input type="url" className="node-input nodrag" placeholder="https://… or connect an image" value={d.imageUrl || ""} onChange={e => updateNodeData(id, { imageUrl: e.target.value })} />
        )}
      </Field>
      <Field label="Crop region (%)" hint={`Keeps ${Math.min(w, 100 - x)}% × ${Math.min(h, 100 - y)}% starting ${x}% from the left, ${y}% from the top`}>
        <div className="crop-grid">
          <div className="crop-preview" aria-hidden="true">
            <div className="crop-box" style={{ left: `${x}%`, top: `${y}%`, width: `${Math.min(w, 100 - x)}%`, height: `${Math.min(h, 100 - y)}%` }} />
          </div>
          <div className="crop-inputs">
            {KEYS.map(([lbl, key, def]) => (
              <label key={key} className="mini-field">
                <span>{lbl}</span>
                <input type="number" min={0} max={100} className="node-input nodrag" value={d[key] ?? def}
                  onChange={e => updateNodeData(id, { [key]: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
              </label>
            ))}
          </div>
        </div>
      </Field>
      {d.isRunning && <Skeleton height={110} />}
      {hasOutput && !d.isRunning && (
        <MediaResult title="Cropped image" url={outputUrl as string} kind="image" filename="cropped-image.jpg"
          meta={d.runOutput?.width && d.runOutput?.height ? `${d.runOutput.width} × ${d.runOutput.height}` : undefined} />
      )}
    </BaseNode>
  );
});
