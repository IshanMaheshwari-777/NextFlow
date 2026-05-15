"use client";
import React, { memo, useState } from "react";
import ReactDOM from "react-dom";
import { NodeProps } from "@xyflow/react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";

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
            color: "#a78bfa", overflowX: "auto", lineHeight: 1.5,
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
          <span style={{ color: "#3b82f6", fontSize: 10, marginTop: 2 }}>●</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>{formatInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(<div key={i} style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, margin: "1px 0" }}>{formatInline(line)}</div>);
  }

  return elements;
}

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1]) parts.push(<strong key={match.index} style={{ color: "var(--text)", fontWeight: 600 }}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index} style={{ color: "#3b82f6" }}>{match[4]}</em>);
    else if (match[5]) parts.push(<code key={match.index} style={{ background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px", fontSize: 10, color: "#3b82f6", fontFamily: "'SF Mono', monospace" }}>{match[6]}</code>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

/* ---------------- RESPONSE RENDERER ---------------- */

function PromptResponseRenderer({ text }: { text: string }) {
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

  const preview = text.length > 120 ? text.slice(0, 120).trimEnd() + "…" : text;

  return (
    <>
      <div style={{ marginTop: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Enhanced Prompt</span>
          <div style={{ display: "flex", gap: 4 }}>
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
            <button type="button" onClick={handleExpand} onMouseDown={e => e.stopPropagation()} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500,
              background: "var(--input-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer", transition: "all 150ms ease",
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
              Expand
            </button>
          </div>
        </div>

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

      {showModal && <ResponseModal text={text} copied={modalCopied} onCopy={handleModalCopy} onClose={() => setShowModal(false)} />}
    </>
  );
}

function ResponseModal({ text, copied, onCopy, onClose }: { text: string; copied: boolean; onCopy: (e: React.MouseEvent) => void; onClose: () => void }) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
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
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Enhanced Prompt</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>{text.length} chars</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              {copied ? "Copied" : "Copy Prompt"}
            </button>
            <button onClick={onClose} style={{
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8,
              background: "transparent", border: "1px solid transparent", color: "var(--text-muted)", cursor: "pointer", transition: "all 150ms ease",
            }} onMouseEnter={e => { e.currentTarget.style.background = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
        <div style={{ padding: "24px", overflowY: "auto", flex: 1, scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}>
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            {renderMarkdown(text)}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ---------------- MAIN COMPONENT ---------------- */

export default memo(function PromptEnhancerNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useWorkflowStore();
  const rawData = data as any;
  const connectedInputs: string[] = rawData.connectedInputs || [];

  const d = {
    ...rawData,
    result: rawData.runOutput?.text || "",
    isRunning: rawData.runStatus === "running",
    runError: rawData.runStatus === "failed"
  };

  return (
    <BaseNode
      id={id}
      type="prompt-enhancer"
      label={rawData.label || "Enhance Prompt"}
      accentColor="#3b82f6"
      icon={
        <div style={{color:'#3b82f6', fontSize:'12px'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
        </div>
      }
      isRunning={d.isRunning}
      runStatus={rawData.runStatus}
      runError={rawData.runError}
      selected={selected}
    >
      <div style={{display:'flex', flexDirection:'column', gap:'12px', padding:'4px 0'}}>
        {/* 1. Source prompt field */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">Prompt{connectedInputs.includes('prompt') && <span className="text-red-400 text-[9px]">← connected</span>}</label>
          <textarea
            rows={2}
            className="node-input"
            placeholder="Enter a basic prompt to enhance..."
            value={d.userMessage || d.prompt || ''}
            disabled={connectedInputs.includes('prompt')}
            data-connected={connectedInputs.includes('prompt')}
            onChange={e => updateNodeData(id, { userMessage: e.target.value, prompt: e.target.value })}
          />
        </div>

        {/* 2. Target style dropdown */}
        <div>
          <p style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.08em',
            textTransform:'uppercase',color:'var(--text-muted)',marginBottom:'4px'}}>
            Target Style
          </p>
          <select
            className="node-input"
            value={d.style || 'Cinematic'}
            onChange={e => updateNodeData(id, { style: e.target.value })}
          >
            {['Cinematic','Hyper-Realistic','Anime','Artistic',
              'Product Photography','Ad Creative'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* 3. Enhanced result */}
        {d.result && !d.isRunning && (
          <PromptResponseRenderer text={d.result} />
        )}

        {/* 4. Loading skeleton */}
        {d.isRunning && !d.result && (
          <div>
            <p style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.08em',
              textTransform:'uppercase',color:'var(--text-muted)',marginBottom:'4px'}}>
              Enhanced Prompt
            </p>
            {[60,80,45].map((w,i) => (
              <div key={i} style={{
                height:'10px',borderRadius:'3px',marginBottom:'5px',
                width:`${w}%`,
                background:'linear-gradient(90deg,#141414 25%,#1f1f1f 50%,#141414 75%)',
                backgroundSize:'200% 100%',
                animation:'shimmer 1.4s ease-in-out infinite',
                animationDelay:`${i*0.15}s`,
              }}/>
            ))}
          </div>
        )}

        {/* 5. Error state */}
        {d.runError && !d.isRunning && (
          <p style={{fontSize:'10px',color:'#f87171',padding:'6px 8px',
            borderRadius:'5px',background:'rgba(239,68,68,0.07)',
            border:'1px solid rgba(239,68,68,0.15)'}}>
            Enhancement failed — check API connection
          </p>
        )}
      </div>
    </BaseNode>
  );
});
