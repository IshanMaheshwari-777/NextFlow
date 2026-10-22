"use client";
import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import type { NodeType } from "@nextflow/shared/types";
import { useWorkflowStore } from "@/store/workflowStore";

const W = 288, H = 300, GAP = 24;

/**
 * Adds a node near a screen point (or the canvas centre), nudged to the nearest spot that
 * doesn't overlap an existing node, and pans the camera if it would land off-screen.
 * `exact` skips the nudge — used for drag-and-drop, where the user chose the spot.
 */
export function useAddNode() {
  const { screenToFlowPosition, flowToScreenPosition, setCenter, getZoom } = useReactFlow();
  return useCallback((type: NodeType, at?: { x: number; y: number } | null, exact = false) => {
    const pane = document.querySelector(".react-flow")?.getBoundingClientRect();
    const target = at ?? (pane ? { x: pane.left + pane.width / 2, y: pane.top + pane.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 });
    // Offset so the node's header lands under the cursor rather than its top-left corner.
    const p = screenToFlowPosition({ x: target.x - (exact ? 40 : W / 2), y: target.y - 20 });
    let spot = p;
    if (!exact) {
      const rects = useWorkflowStore.getState().nodes.map(n => {
        const m = (n as { measured?: { width?: number; height?: number } }).measured;
        return { x: n.position.x, y: n.position.y, w: m?.width ?? W, h: m?.height ?? H };
      });
      const free = (x: number, y: number) => rects.every(r => x + W + GAP <= r.x || r.x + r.w + GAP <= x || y + H + GAP <= r.y || r.y + r.h + GAP <= y);
      search: for (let ring = 0; ring < 12; ring++) {
        for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const cand = { x: p.x + dx * ring * 80, y: p.y + dy * ring * 80 };
          if (free(cand.x, cand.y)) { spot = cand; break search; }
        }
      }
    }
    useWorkflowStore.getState().addNode(type, spot);
    const tl = flowToScreenPosition(spot), br = flowToScreenPosition({ x: spot.x + W, y: spot.y + H });
    const bounds = pane ?? { left: 0, top: 52, right: window.innerWidth, bottom: window.innerHeight };
    if (tl.x < bounds.left || tl.y < bounds.top || br.x > bounds.right || br.y > bounds.bottom - 70) {
      setCenter(spot.x + W / 2, spot.y + H / 2, { zoom: getZoom(), duration: 300 });
    }
  }, [screenToFlowPosition, flowToScreenPosition, setCenter, getZoom]);
}
