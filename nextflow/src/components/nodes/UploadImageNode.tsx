"use client";
import { memo, useRef } from "react";
import { NodeProps } from "@xyflow/react";
import { Image as ImageIcon, Upload, X } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";

export default memo(function UploadImageNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useWorkflowStore();
  const ref = useRef<HTMLInputElement>(null);
  const d = data as any;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => { const b64 = (e.target?.result as string).split(",")[1]; updateNodeData(id, { fileData: b64, fileName: file.name, mimeType: file.type, previewUrl: URL.createObjectURL(file), fileUrl: undefined }); };
    reader.readAsDataURL(file);
  };

  return (
    <BaseNode id={id} type="upload-image" label={d.label || "Upload Image"} accentColor="#10b981" icon={<ImageIcon className="w-3.5 h-3.5" />} isRunning={d.isRunning} runStatus={d.runStatus} selected={selected}>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {d.previewUrl || d.fileUrl ? (
        <div className="relative">
          <img src={d.fileUrl || d.previewUrl} alt="preview" className="w-full h-28 object-cover rounded-lg border border-[#2a2a2a]" />
          <button onClick={() => updateNodeData(id, { fileData: undefined, fileName: undefined, mimeType: undefined, previewUrl: undefined, fileUrl: undefined })} className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center hover:bg-red-500/80"><X className="w-3 h-3 text-white" /></button>
          {d.fileName && <p className="text-[10px] text-zinc-500 mt-1 truncate">{d.fileName}</p>}
          {d.fileUrl && <p className="text-[10px] text-emerald-400">✓ Uploaded to CDN</p>}
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
