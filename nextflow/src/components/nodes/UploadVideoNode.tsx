"use client";
import { memo, useRef } from "react";
import { NodeProps } from "@xyflow/react";
import { Video, Upload, X } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";

export default memo(function UploadVideoNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useWorkflowStore();
  const ref = useRef<HTMLInputElement>(null);
  const d = data as any;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => { const b64 = (e.target?.result as string).split(",")[1]; updateNodeData(id, { fileData: b64, fileName: file.name, mimeType: file.type, fileUrl: undefined }); };
    reader.readAsDataURL(file);
  };

  return (
    <BaseNode id={id} type="upload-video" label={d.label || "Upload Video"} accentColor="#f59e0b" icon={<Video className="w-3.5 h-3.5" />} isRunning={d.isRunning} runStatus={d.runStatus} selected={selected}>
      <input ref={ref} type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {d.fileName ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-3 py-2 border border-[#2a2a2a]">
            <Video className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] text-zinc-300 truncate flex-1">{d.fileName}</span>
            <button onClick={() => updateNodeData(id, { fileData: undefined, fileName: undefined, mimeType: undefined, fileUrl: undefined })}><X className="w-3.5 h-3.5 text-zinc-600 hover:text-red-400" /></button>
          </div>
          {d.fileUrl && <p className="text-[10px] text-amber-400">✓ Uploaded to CDN</p>}
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
