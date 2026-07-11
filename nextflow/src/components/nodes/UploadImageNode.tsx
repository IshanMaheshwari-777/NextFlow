"use client";
import { memo, useRef, useState } from "react";
import { NodeProps } from "@xyflow/react";
import { Image as ImageIcon, Upload, X, Loader2 } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { uploadFile } from "@/lib/uploadClient";

export default memo(function UploadImageNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData);
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
  const d = data as any;

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    updateNodeData(id, { previewUrl, fileName: file.name, mimeType: file.type, fileUrl: undefined, fileData: undefined });

    try {
      // Read file as base64
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve((e.target?.result as string).split(",")[1]);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      // Pre-upload to Transloadit via our API
      const result = await uploadFile(b64, file.name, file.type, "image");
      if (!result.imageUrl) throw new Error("No URL returned from upload");

      // Store the CDN URL — no more base64 in node data
      updateNodeData(id, {
        fileUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl,
        fileData: undefined, // Clear base64 — we have the URL now
        previewUrl, // keep local preview
      });
      console.log(`[UploadImageNode] ${id} uploaded: ${result.imageUrl.slice(0, 60)}...`);
    } catch (err) {
      console.error("[UploadImageNode] Upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
      updateNodeData(id, { fileData: undefined, fileUrl: undefined });
    } finally {
      setUploading(false);
    }
  };

  return (
    <BaseNode id={id} type="upload-image" label={d.label || "Upload Image"} accentColor="#10b981" icon={<ImageIcon className="w-3.5 h-3.5" />} isRunning={d.isRunning} runStatus={d.runStatus} runError={d.runError} selected={selected}>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {d.previewUrl || d.fileUrl ? (
        <div className="relative">
          <img src={d.fileUrl || d.previewUrl} alt="preview" className="w-full h-28 object-cover rounded-lg border border-[#2a2a2a]" />
          {uploading && (
            <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              <span className="text-[10px] text-emerald-400 ml-1.5">Uploading…</span>
            </div>
          )}
          <button onClick={() => { updateNodeData(id, { fileData: undefined, fileName: undefined, mimeType: undefined, previewUrl: undefined, fileUrl: undefined, thumbnailUrl: undefined }); setError(null); }} className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center hover:bg-red-500/80"><X className="w-3 h-3 text-white" /></button>
          {d.fileName && <p className="text-[10px] text-zinc-500 mt-1 truncate">{d.fileName}</p>}
          {d.fileUrl && !uploading && <p className="text-[10px] text-emerald-400">✓ Uploaded to CDN</p>}
          {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
        </div>
      ) : (
        <div className="border-2 border-dashed border-[#2a2a2a] hover:border-emerald-500/40 rounded-lg p-4 text-center cursor-pointer transition-colors" onClick={() => ref.current?.click()} onDragOver={e => { e.preventDefault(); e.stopPropagation(); }} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith("image/")) handleFile(f); }}>
          <Upload className="w-4 h-4 text-zinc-600 mx-auto mb-1" />
          <p className="text-[11px] text-zinc-500">Click or drag image</p>
          <p className="text-[10px] text-zinc-700 mt-0.5">jpg, png, webp, gif</p>
        </div>
      )}
    </BaseNode>
  );
});
