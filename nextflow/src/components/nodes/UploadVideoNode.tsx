"use client";
import { memo, useRef, useState } from "react";
import { NodeProps } from "@xyflow/react";
import { Video, Upload, X, Loader2 } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";

export default memo(function UploadVideoNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useWorkflowStore();
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const d = data as any;

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    // Create local preview URL
    const previewUrl = URL.createObjectURL(file);
    updateNodeData(id, { previewUrl, fileName: file.name, mimeType: file.type, fileUrl: undefined, fileData: undefined });

    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve((e.target?.result as string).split(",")[1]);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData: b64, fileName: file.name, mimeType: file.type, type: "video" }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Upload failed");
        throw new Error(errText);
      }

      const result = await res.json();
      if (!result.videoUrl) throw new Error("No URL returned from upload");

      updateNodeData(id, {
        fileUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        fileData: undefined,
      });
      console.log(`[UploadVideoNode] ${id} uploaded: ${result.videoUrl.slice(0, 60)}... (${result.duration}ms)`);
    } catch (err: any) {
      console.error("[UploadVideoNode] Upload failed:", err);
      setError(err?.message || "Upload failed");
      updateNodeData(id, { fileData: undefined, fileUrl: undefined });
    } finally {
      setUploading(false);
    }
  };

  const videoSrc = d.fileUrl || d.previewUrl;
  const hasVideo = !!(videoSrc || d.fileName);

  return (
    <BaseNode id={id} type="upload-video" label={d.label || "Upload Video"} accentColor="#f59e0b" icon={<Video className="w-3.5 h-3.5" />} isRunning={d.isRunning} runStatus={d.runStatus} runError={d.runError} selected={selected}>
      <input ref={ref} type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {hasVideo ? (
        <div className="space-y-1.5">
          {/* Video Player */}
          {videoSrc && (
            <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid #2a2a2a", background: "#0a0a0f" }}>
              <video
                src={videoSrc}
                controls
                style={{ width: "100%", height: 120, objectFit: "cover", display: "block", borderRadius: 8 }}
                onMouseDown={e => e.stopPropagation()}
              />
            </div>
          )}
          <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-3 py-2 border border-[#2a2a2a]">
            {uploading ? <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" /> : <Video className="w-4 h-4 text-amber-400 shrink-0" />}
            <span className="text-[11px] text-zinc-300 truncate flex-1">{d.fileName}</span>
            <button onClick={() => { updateNodeData(id, { fileData: undefined, fileName: undefined, mimeType: undefined, fileUrl: undefined, thumbnailUrl: undefined, previewUrl: undefined }); setError(null); }}><X className="w-3.5 h-3.5 text-zinc-600 hover:text-red-400" /></button>
          </div>
          {uploading && <p className="text-[10px] text-amber-400">Uploading to CDN…</p>}
          {d.fileUrl && !uploading && <p className="text-[10px] text-amber-400">✓ Uploaded to CDN</p>}
          {error && <p className="text-[10px] text-red-400">{error}</p>}
        </div>
      ) : (
        <div className="border-2 border-dashed border-[#2a2a2a] hover:border-amber-500/40 rounded-lg p-4 text-center cursor-pointer transition-colors" onClick={() => ref.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith("video/")) handleFile(f); }}>
          <Upload className="w-4 h-4 text-zinc-600 mx-auto mb-1" />
          <p className="text-[11px] text-zinc-500">Click or drag video</p>
          <p className="text-[10px] text-zinc-700 mt-0.5">mp4, mov, webm, mkv</p>
        </div>
      )}
    </BaseNode>
  );
});
