"use client";
import { memo, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";

/** Bezier wire with a small remove button at its midpoint on hover/selection. */
export default memo(function DeletableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, selected }: EdgeProps) {
  const [hover, setHover] = useState(false);
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const remove = () => useWorkflowStore.getState().onEdgesChange([{ type: "remove", id }]);
  const show = hover || selected;

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ ...style, strokeWidth: selected ? 3 : 2, opacity: selected || hover ? 1 : 0.85 }} />
      {/* Wide invisible hit area so thin wires are easy to hover/click */}
      <path d={path} fill="none" stroke="transparent" strokeWidth={18} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ cursor: "pointer" }} />
      <EdgeLabelRenderer>
        <button
          type="button"
          aria-label="Remove connection"
          title="Remove connection"
          className="edge-remove nodrag nopan"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={e => { e.stopPropagation(); remove(); }}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, opacity: show ? 1 : 0, pointerEvents: show ? "all" : "none" }}
        >
          <X size={10} />
        </button>
      </EdgeLabelRenderer>
    </>
  );
});
