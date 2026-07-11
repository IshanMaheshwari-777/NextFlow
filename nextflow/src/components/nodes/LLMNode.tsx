"use client";
import React, { memo, useState } from "react";
import ReactDOM from "react-dom";
import { NodeProps } from "@xyflow/react";
import { Sparkles } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { GROQ_MODELS } from "@/types";

/* ---------------- SIMPLE MARKDOWN RENDERER ---------------- */

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.trim().replace("```", "");
        codeBuffer = [];
        continue;
      } else {
        inCodeBlock = false;
        elements.push(
          <pre key={`code-${i}`} style={{
            background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
            padding: "8px 10px", margin: "6px 0", fontSize: 11, fontFamily: "'SF Mono', 'Fira Code', monospace",
            color: "var(--text)", overflowX: "auto", lineHeight: 1.5,
          }}>
            {codeLang && <span style={{ fontSize: 9, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{codeLang}</span>}
            {codeBuffer.join("\n")}
          </pre>
        );
        continue;
      }
    }

    if (inCodeBlock) { codeBuffer.push(line); continue; }

    // Empty line
    if (!line.trim()) { elements.push(<div key={`br-${i}`} style={{ height: 6 }} />); continue; }

    // Headers
    if (line.startsWith("### ")) { elements.push(<div key={i} style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", margin: "8px 0 4px" }}>{formatInline(line.slice(4))}</div>); continue; }
    if (line.startsWith("## ")) { elements.push(<div key={i} style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "8px 0 4px" }}>{formatInline(line.slice(3))}</div>); continue; }
    if (line.startsWith("# ")) { elements.push(<div key={i} style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "8px 0 4px" }}>{formatInline(line.slice(2))}</div>); continue; }

    // Bullet lists
    if (line.match(/^[\-\*]\s/)) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 6, paddingLeft: 4, margin: "2px 0" }}>
          <span style={{ color: "var(--text)", fontSize: 10, marginTop: 2 }}>●</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>{formatInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Numbered lists
    const numMatch = line.match(/^(\d+)\.\s/);
    if (numMatch) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 6, paddingLeft: 4, margin: "2px 0" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, minWidth: 14 }}>{numMatch[1]}.</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>{formatInline(line.slice(numMatch[0].length))}</span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(<div key={i} style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, margin: "1px 0" }}>{formatInline(line)}</div>);
  }

  return elements;
}

/* Format inline: **bold**, *italic*, `code` */
function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1]) parts.push(<strong key={match.index} style={{ color: "var(--text)", fontWeight: 600 }}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index} style={{ color: "var(--text)" }}>{match[4]}</em>);
    else if (match[5]) parts.push(<code key={match.index} style={{ background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px", fontSize: 10, color: "var(--text)", fontFamily: "'SF Mono', monospace" }}>{match[6]}</code>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

/* ---------------- RESPONSE RENDERER ---------------- */

function LLMResponseRenderer({ text }: { text: string }) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modalCopied, setModalCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleModalCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setModalCopied(true);
    setTimeout(() => setModalCopied(false), 1500);
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  };

  // Short preview text (first ~120 chars)
  const preview = text.length > 120 ? text.slice(0, 120).trimEnd() + "…" : text;

  return (
    <>
      <div style={{ marginTop: 6 }}>
        {/* Header bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Response</span>
          <div style={{ display: "flex", gap: 4 }}>
            {/* Copy button */}
            <button type="button" onClick={handleCopy} onMouseDown={e => e.stopPropagation()} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500,
              background: copied ? "rgba(52,211,153,0.12)" : "var(--input-bg)", color: copied ? "#34d399" : "var(--text-secondary)",
              border: `1px solid ${copied ? "rgba(52,211,153,0.2)" : "var(--border)"}`, cursor: "pointer", transition: "all 150ms ease",
            }}>
              {copied ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            {/* Expand button */}
            <button type="button" onClick={handleExpand} onMouseDown={e => e.stopPropagation()} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500,
              background: "var(--input-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer", transition: "all 150ms ease",
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
              Expand
            </button>
          </div>
        </div>

        {/* Compact inline preview — always small */}
        <div
          onClick={handleExpand}
          onMouseDown={e => e.stopPropagation()}
          style={{
            background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 10,
            padding: "10px 12px", maxHeight: 100, overflow: "hidden",
            position: "relative", cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {preview}
          </div>
          {text.length > 120 && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 36,
              background: "linear-gradient(transparent, var(--input-bg))",
              borderRadius: "0 0 10px 10px", pointerEvents: "none",
            }} />
          )}
        </div>
      </div>

      {/* ─── Full-screen modal overlay ─── */}
      {showModal && <ResponseModal text={text} copied={modalCopied} onCopy={handleModalCopy} onClose={() => setShowModal(false)} />}
    </>
  );
}

/* ─── Response Modal ─── */
function ResponseModal({ text, copied, onCopy, onClose }: { text: string; copied: boolean; onCopy: (e: React.MouseEvent) => void; onClose: () => void }) {
  // Detect JSON
  let isJson = false;
  let jsonData: unknown = null;
  try { jsonData = JSON.parse(text); isJson = true; } catch { }

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="LLM response"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(5,5,10,0.85)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(680px, 90vw)", maxHeight: "80vh",
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column",
          animation: "slideUp 0.2s ease",
        }}
      >
        {/* Modal header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: "var(--border)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>LLM Response</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>{text.length} chars</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Copy in modal */}
            <button type="button" onClick={onCopy} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: copied ? "rgba(52,211,153,0.12)" : "var(--input-bg)", color: copied ? "#34d399" : "var(--text-secondary)",
              border: `1px solid ${copied ? "rgba(52,211,153,0.25)" : "var(--border)"}`, cursor: "pointer", transition: "all 150ms ease",
            }}>
              {copied ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              )}
              {copied ? "Copied!" : "Copy All"}
            </button>
            {/* Close */}
            <button type="button" onClick={onClose} style={{
              width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--input-bg)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-muted)", transition: "all 150ms ease",
            }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "#2e2e3e"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {isJson ? (
            <pre style={{ fontSize: 13, color: "#34d399", fontFamily: "'SF Mono', 'Fira Code', monospace", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {JSON.stringify(jsonData, null, 2)}
            </pre>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>{renderMarkdown(text)}</div>
          )}
        </div>

        {/* Modal footer */}
        <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#2e2e3e" }}>Press ESC to close</span>
          <span style={{ fontSize: 10, color: "#2e2e3e" }}>Powered by Groq</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ---------------- MAIN NODE ---------------- */

export default memo(function LLMNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
  const d = data as any;
  const connected: string[] = d.connectedInputs || [];

  return (
    <BaseNode
      id={id}
      type="llm"
      label={d.label || "LLM Node"}
      accentColor="var(--text)"
      icon={<Sparkles className="w-3.5 h-3.5" />}
      isRunning={d.isRunning}
      runStatus={d.runStatus}
      runError={d.runError}
      selected={selected}
    >
      {/* MODEL */}
      <div className="space-y-1">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Model
        </label>
        <select
          className="node-input"
          value={d.model || "llama-3.1-8b-instant"}
          onChange={(e) => updateNodeData(id, { model: e.target.value })}
        >
          {GROQ_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* SYSTEM PROMPT */}
      <div className="space-y-1">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
          System Prompt
          {connected.includes("system_prompt") && (
            <span className="text-[var(--text-secondary)] text-[9px]">← connected</span>
          )}
        </label>
        <textarea
          className="node-input h-12"
          placeholder="You are a helpful assistant..."
          value={d.system_prompt || ""}
          disabled={connected.includes("system_prompt")}
          data-connected={connected.includes("system_prompt")}
          onChange={(e) =>
            updateNodeData(id, { system_prompt: e.target.value })
          }
        />
      </div>

      {/* USER MESSAGE */}
      <div className="space-y-1">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
          User Message
          {connected.includes("user_message") && (
            <span className="text-[var(--text-secondary)] text-[9px]">← connected</span>
          )}
        </label>
        <textarea
          className="node-input h-12"
          placeholder="Enter prompt..."
          value={d.user_message || ""}
          disabled={connected.includes("user_message")}
          data-connected={connected.includes("user_message")}
          onChange={(e) =>
            updateNodeData(id, { user_message: e.target.value })
          }
        />
      </div>

      {/* IMAGE CONNECTED — auto-switches to Scout */}
      {connected.includes("images") && (
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-emerald-400">
            Image input connected — auto-uses Scout vision
          </span>
        </div>
      )}

      {/* RESPONSE (UPDATED) */}
      {d.result && <LLMResponseRenderer text={d.result} />}

      {/* ERROR */}
      {d.runError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
          <p className="text-[10px] text-red-400">{d.runError}</p>
        </div>
      )}
    </BaseNode>
  );
});