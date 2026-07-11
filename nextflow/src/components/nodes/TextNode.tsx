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
  return (
    <BaseNode id={id} type="text" label={d.label || "Text Node"} accentColor="#6366f1" icon={<Type className="w-3.5 h-3.5" />} isRunning={d.isRunning} runStatus={d.runStatus} runError={d.runError} selected={selected}>
      <textarea className="node-input h-20" placeholder="Enter text here..." value={d.text || ""} onChange={e => updateNodeData(id, { text: e.target.value })} onMouseDown={e => e.stopPropagation()} />
      <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "4px 0 0" }}>Output → text</p>
    </BaseNode>
  );
});
