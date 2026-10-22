"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, Download, ExternalLink } from "lucide-react";
import { Markdown } from "./Markdown";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  width?: number | string;
  children: ReactNode;
  /** Media viewers drop the card chrome and let the content float. */
  bare?: boolean;
};

/** Accessible modal: portal, Escape to close, click-outside to close, focus moves in and returns on close. */
export function Modal({ open, onClose, title, subtitle, actions, width = 560, children, bare }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onCloseRef.current(); } };
    window.addEventListener("keydown", onKey, true);
    // setTimeout, not rAF: rAF never fires in background tabs, which would leave focus behind.
    // A selector list matches in DOM order (the header's close button would win), so look up
    // the explicit autofocus target first and only then fall back to the first field.
    const t = setTimeout(() => {
      const panel = panelRef.current;
      (panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>("textarea, input") ?? panel?.querySelector<HTMLElement>("button"))?.focus();
    }, 0);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey, true); prev?.focus?.(); };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={bare ? "modal-bare" : "modal-panel"}
        style={bare ? undefined : { width: typeof width === "number" ? `min(${width}px, calc(100vw - 32px))` : width }}
      >
        {!bare && (title || actions) && (
          <div className="modal-header">
            <div style={{ minWidth: 0 }}>
              {title && <h2 className="modal-title">{title}</h2>}
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {actions}
              <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={15} /></button>
            </div>
          </div>
        )}
        {bare && <button className="icon-btn modal-bare-close" onClick={onClose} aria-label="Close"><X size={16} /></button>}
        {children}
      </div>
    </div>,
    document.body
  );
}

export function CopyButton({ text, label = "Copy", small }: { text: string; label?: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`btn btn-secondary ${small ? "btn-xs" : "btn-sm"} nodrag`}
      onClick={async e => {
        e.stopPropagation();
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* clipboard blocked */ }
      }}
    >
      {copied ? <Check size={small ? 11 : 13} style={{ color: "var(--success)" }} /> : <Copy size={small ? 11 : 13} />}
      {copied ? "Copied" : label}
    </button>
  );
}

/** Downloads a remote file; falls back to opening it in a new tab when CORS blocks the fetch. */
export async function downloadUrl(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

export function TextResultModal({ open, onClose, title, text }: { open: boolean; onClose: () => void; title: string; text: string }) {
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  const isJson = json !== null && typeof json === "object";
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={`${text.length.toLocaleString()} characters`} width={720} actions={<CopyButton text={text} label="Copy all" />}>
      <div className="modal-body" style={{ maxHeight: "70vh" }}>
        {isJson ? <pre className="code-block">{JSON.stringify(json, null, 2)}</pre> : <Markdown text={text} />}
      </div>
    </Modal>
  );
}

export function MediaPreviewModal({ open, onClose, src, kind = "image", filename }: { open: boolean; onClose: () => void; src: string; kind?: "image" | "video"; filename: string }) {
  return (
    <Modal open={open} onClose={onClose} bare>
      {kind === "image"
         
        ? <img src={src} alt={filename} className="media-full" />
        : <video src={src} controls autoPlay className="media-full" />}
      <div className="media-actions">
        <button className="btn btn-secondary btn-sm" onClick={() => downloadUrl(src, filename)}><Download size={13} /> Download</button>
        <button className="btn btn-secondary btn-sm" onClick={() => window.open(src, "_blank", "noopener")}><ExternalLink size={13} /> Open original</button>
      </div>
    </Modal>
  );
}
