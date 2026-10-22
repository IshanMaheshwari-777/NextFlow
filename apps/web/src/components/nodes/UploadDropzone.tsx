"use client";
import { useRef, useState } from "react";
import { Upload, X, Loader2, CheckCircle2, Link2, AlertCircle } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { uploadFile } from "@/lib/uploadClient";

const LIMITS = { image: 10, video: 50 }; // MB — keep in sync with /api/upload

/** Shared upload UI for image & video source nodes: drop/click to upload, or paste a public URL. */
export default function UploadDropzone({ id, kind, data }: { id: string; kind: "image" | "video"; data: Record<string, unknown> }) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fileUrl = data.fileUrl as string | undefined;
  const previewUrl = data.previewUrl as string | undefined;
  const fileName = data.fileName as string | undefined;
  const src = fileUrl || previewUrl;
  const accept = kind === "image" ? "image/jpeg,image/png,image/webp,image/gif" : "video/mp4,video/quicktime,video/webm,video/x-matroska";

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith(`${kind}/`)) { setError(`That's not ${kind === "image" ? "an image" : "a video"} file.`); return; }
    if (file.size > LIMITS[kind] * 1024 * 1024) { setError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${LIMITS[kind]} MB.`); return; }
    setUploading(true);
    setProgress("Reading file…");
    const localPreview = URL.createObjectURL(file);
    updateNodeData(id, { previewUrl: localPreview, fileName: file.name, mimeType: file.type, fileUrl: undefined, fileData: undefined, thumbnailUrl: undefined });
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve((e.target?.result as string).split(",")[1]);
        reader.onerror = () => reject(new Error("Couldn't read that file."));
        reader.readAsDataURL(file);
      });
      setProgress(kind === "video" ? "Uploading & encoding — videos can take a minute…" : "Uploading…");
      const result = await uploadFile(b64, file.name, file.type, kind);
      const url = kind === "image" ? result.imageUrl : result.videoUrl;
      if (!url) throw new Error("Upload finished but no URL came back.");
      updateNodeData(id, { fileUrl: url, thumbnailUrl: result.thumbnailUrl ?? undefined, previewUrl: kind === "image" ? localPreview : undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      updateNodeData(id, { fileUrl: undefined, previewUrl: undefined, fileName: undefined });
      URL.revokeObjectURL(localPreview);
    } finally {
      setUploading(false);
      setProgress("");
    }
  };

  const applyUrl = () => {
    const v = urlDraft.trim();
    if (!/^https?:\/\/\S+$/i.test(v)) { setError("Enter a full URL starting with https://"); return; }
    setError(null);
    updateNodeData(id, { fileUrl: v, previewUrl: undefined, fileName: v.split("/").pop()?.split("?")[0] || v, mimeType: undefined, thumbnailUrl: undefined });
    setUrlMode(false); setUrlDraft("");
  };

  const clear = () => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    updateNodeData(id, { fileData: undefined, fileName: undefined, mimeType: undefined, previewUrl: undefined, fileUrl: undefined, thumbnailUrl: undefined });
    setError(null);
  };

  return (
    <div className="nodrag">
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      {src ? (
        <div className="upload-preview">
          <div style={{ position: "relative" }}>
            {kind === "image"
               
              ? <img src={src} alt={fileName || "Uploaded image"} className="media-thumb" />
              : <video src={src} controls preload="metadata" className="media-thumb" />}
            {uploading && (
              <div className="upload-overlay"><Loader2 size={16} className="animate-spin" /><span>{progress}</span></div>
            )}
            {!uploading && (
              <button type="button" className="upload-clear" onClick={clear} aria-label="Remove file" title="Remove"><X size={12} /></button>
            )}
          </div>
          <div className="upload-meta">
            <span className="truncate" title={fileName}>{fileName}</span>
            {fileUrl && !uploading && <span className="upload-ok"><CheckCircle2 size={11} /> Ready</span>}
          </div>
        </div>
      ) : urlMode ? (
        <div className="field">
          <input autoFocus type="url" className="node-input" placeholder={`https://…/${kind === "image" ? "photo.jpg" : "clip.mp4"}`} value={urlDraft}
            onChange={e => setUrlDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") applyUrl(); if (e.key === "Escape") setUrlMode(false); }} />
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" className="btn btn-primary btn-xs" onClick={applyUrl}>Use URL</button>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => { setUrlMode(false); setError(null); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div
            role="button"
            tabIndex={0}
            className={`dropzone ${dragOver ? "is-over" : ""}`}
            onClick={() => inputRef.current?.click()}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          >
            <Upload size={16} />
            <span className="dropzone-title">Drop {kind === "image" ? "an image" : "a video"} or click to browse</span>
            <span className="dropzone-sub">{kind === "image" ? "JPG, PNG, WEBP, GIF" : "MP4, MOV, WEBM, MKV"} · up to {LIMITS[kind]} MB</span>
          </div>
          <button type="button" className="btn btn-ghost btn-xs" style={{ marginTop: 6 }} onClick={() => setUrlMode(true)}><Link2 size={11} /> Use a URL instead</button>
        </>
      )}
      {error && <p className="field-error"><AlertCircle size={11} /> {error}</p>}
    </div>
  );
}
