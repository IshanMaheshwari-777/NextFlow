"use client";
import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import { Type } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";

export default memo(function TextNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
  const d = data as any;
  const text: string = d.text || "";
  return (
    <BaseNode id={id} type="text" label={d.label || "Text"} icon={<Type size={13} />} isRunning={d.isRunning} runStatus={d.runStatus} runError={d.runError} selected={selected}>
      <textarea
        className="node-input nodrag nowheel"
        rows={4}
        placeholder="Write a prompt, a product description, instructions…"
        value={text}
        onChange={e => updateNodeData(id, { text: e.target.value })}
      />
      <p className="field-hint" style={{ textAlign: "right" }}>{text.length > 0 ? `${text.length} chars` : "Connect the output to any text input"}</p>
    </BaseNode>
  );
});
