"use client";
import { memo, useCallback } from "react";
import { NodeProps } from "@xyflow/react";
import { Wand2, Download, ExternalLink } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";

const RESOLUTIONS = ["720p", "1080p", "4K"] as const;
const STRENGTHS   = ["light", "medium", "strong"] as const;

// Shared pill button style — mirrors GenerateImageNode aspect-ratio pills exactly
function pillStyle(active: boolean) {
  return {
    flex: 1,
    height: "26px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: active ? 600 : 400,
    background: active ? "var(--border)" : "transparent",
    border: active ? "1px solid var(--border)" : "1px solid var(--border-subtle)",
    color: active ? "var(--text)" : "var(--text-muted)",
    transition: "all 100ms ease",
    textTransform: "capitalize" as const,
  };
}

export default memo(function VideoEnhanceNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
  const d = data as any;
  const connected: string[] = d.connectedInputs || [];
  const isConnected = connected.includes("video_url");

  // Derive state from runStatus/runOutput (same pattern as CropImageNode / ExtractFrameNode)
  const outputVideoUrl: string | null = d.runOutput?.videoUrl || d.runOutput?.output || null;
  const hasResult = outputVideoUrl && typeof outputVideoUrl === "string" && outputVideoUrl.startsWith("http");
  const isRunning  = d.runStatus === "running";
  const hasFailed  = d.runStatus === "failed";

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!outputVideoUrl) return;
    try {
      const res  = await fetch(outputVideoUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "enhanced-video.mp4";
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  }, [outputVideoUrl]);

  return (
    <BaseNode
      id={id}
      type="video-enhance"
      label={d.label || "Video Enhance"}
      accentColor="#06b6d4"
      icon={<Wand2 className="w-3.5 h-3.5" />}
      isRunning={isRunning}
      runStatus={d.runStatus}
      runError={d.runError}
      selected={selected}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "4px 0" }}>

        {/* 1. Video URL manual input */}
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            Video URL {isConnected && <span className="text-cyan-400 text-[9px]">← connected</span>}
          </label>
          <input
            type="url"
            className="node-input"
            placeholder="https://cdn.transloadit.com/..."
            value={d.video_url || ""}
            disabled={isConnected}
            data-connected={isConnected}
            onChange={e => updateNodeData(id, { video_url: e.target.value })}
          />
        </div>

        {/* 2. Resolution pills */}
        <div>
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>
            Output Resolution
          </p>
          <div style={{ display: "flex", gap: "4px" }}>
            {RESOLUTIONS.map(r => (
              <button
                key={r}
                onClick={() => updateNodeData(id, { resolution: r })}
                onMouseDown={e => e.stopPropagation()}
                style={pillStyle(d.resolution === r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Strength pills */}
        <div>
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>
            Enhancement
          </p>
          <div style={{ display: "flex", gap: "4px" }}>
            {STRENGTHS.map(s => (
              <button
                key={s}
                onClick={() => updateNodeData(id, { strength: s })}
                onMouseDown={e => e.stopPropagation()}
                style={pillStyle(d.strength === s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <p style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "5px", fontStyle: "italic" }}>
            Upscales resolution · Denoises · Sharpens · Enhances color
          </p>
        </div>

        {/* 4. Loading skeleton — while running */}
        {isRunning && (
          <div>
            <div
              style={{
                width: "100%",
                height: "60px",
                borderRadius: "7px",
                background: "linear-gradient(90deg,#141414 25%,#1f1f1f 50%,#141414 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s ease-in-out infinite",
              }}
            />
            <p style={{ fontSize: "9px", color: "var(--text-muted)", textAlign: "center", marginTop: "6px", fontStyle: "italic" }}>
              Enhancing video… this may take 1–3 minutes depending on video length and target resolution
            </p>
          </div>
        )}

        {/* 5. Result — enhanced video player */}
        {hasResult && !isRunning && (
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Enhanced Video</label>
            <video
              src={outputVideoUrl!}
              controls
              style={{
                width: "100%",
                height: "120px",
                objectFit: "cover",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "#0a0a0a",
                display: "block",
              }}
              preload="metadata"
              onMouseDown={e => e.stopPropagation()}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={handleDownload}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500,
                  background: "var(--input-bg)", color: "var(--text-secondary)",
                  border: "1px solid var(--border)", cursor: "pointer",
                }}
              >
                <Download style={{ width: 10, height: 10 }} /> Download
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); window.open(outputVideoUrl!, "_blank"); }}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500,
                  background: "var(--input-bg)", color: "var(--text-secondary)",
                  border: "1px solid var(--border)", cursor: "pointer",
                }}
              >
                <ExternalLink style={{ width: 10, height: 10 }} /> Open
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: "#22c55e" }}>✓ Enhanced successfully</span>
              <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                {d.runOutput?.resolution || d.resolution} · {(d.runOutput?.strength || d.strength || "medium").charAt(0).toUpperCase() + (d.runOutput?.strength || d.strength || "medium").slice(1)}
              </span>
            </div>
          </div>
        )}

        {/* 6. Error state */}
        {hasFailed && !isRunning && (
          <div style={{
            padding: "8px", borderRadius: "6px",
            background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)",
          }}>
            <p style={{ fontSize: "10px", color: "#f87171", margin: 0 }}>
              {d.runError || "Enhancement failed."} Try a shorter video or lower resolution.
            </p>
          </div>
        )}

      </div>
    </BaseNode>
  );
});
