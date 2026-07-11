"use client";
import { memo, useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { NodeProps } from "@xyflow/react";
import { Crop, Download, Maximize2 } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";

function ImagePreviewModal({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
        <img src={src} alt={label} style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 12, border: "1px solid var(--border)" }} />
        <button
          type="button" onClick={onClose} aria-label="Close preview"
          style={{
            position: "absolute", top: -12, right: -12,
            width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--input-bg)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-secondary)",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "#2e2e3e"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
    </div>,
    document.body
  );
}

export default memo(function CropImageNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
  const d = data as any;
  const connected: string[] = d.connectedInputs || [];
  const isConnected = connected.includes("imageUrl") || connected.includes("image_url");
  const [showModal, setShowModal] = useState(false);

  // Extract output image URL from runOutput
  const outputImageUrl = d.runOutput?.imageUrl || d.runOutput?.output || null;
  const outputIsImage = outputImageUrl && typeof outputImageUrl === "string" && outputImageUrl.startsWith("http");

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(outputImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "cropped-image.jpg"; a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  }, [outputImageUrl]);

  return (
    <BaseNode id={id} type="crop-image" label={d.label || "Crop Image"} accentColor="#ef4444" icon={<Crop className="w-3.5 h-3.5" />} isRunning={d.isRunning} runStatus={d.runStatus} runError={d.runError} selected={selected}>
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
      {/* PART 5: Show cropped image output with download + view modal */}
      {outputIsImage && (
        <div className="space-y-1.5 mt-2">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Cropped Result</label>
          <img src={outputImageUrl} alt="cropped" style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer" }} onClick={() => setShowModal(true)} onMouseDown={e => e.stopPropagation()} />
          {(d.runOutput?.width || d.runOutput?.height) && (
            <p className="text-[10px] text-zinc-500">{d.runOutput.width} × {d.runOutput.height}</p>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={handleDownload} onMouseDown={e => e.stopPropagation()} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500,
              background: "var(--input-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer",
            }}>
              <Download style={{ width: 10, height: 10 }} /> Download
            </button>
            <button type="button" onClick={() => setShowModal(true)} onMouseDown={e => e.stopPropagation()} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500,
              background: "var(--input-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer",
            }}>
              <Maximize2 style={{ width: 10, height: 10 }} /> View full size
            </button>
          </div>
        </div>
      )}
      {showModal && outputIsImage && <ImagePreviewModal src={outputImageUrl} label="Cropped Image" onClose={() => setShowModal(false)} />}
    </BaseNode>
  );
});
