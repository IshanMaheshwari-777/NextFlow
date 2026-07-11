"use client";
import React, { memo, useState, useEffect } from "react";
import { NodeProps } from "@xyflow/react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { useShallow } from "zustand/react/shallow";
import { Download, Maximize2, Clock } from "lucide-react";

export default memo(function GenerateImageNode({ id, data, selected }: NodeProps) {
  const { updateNodeData, cooldownEnd, startCooldown } = useWorkflowStore(
    useShallow(s => ({ updateNodeData: s.updateNodeData, cooldownEnd: s.cooldownEnd, startCooldown: s.startCooldown }))
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
  const rawData = data as any;
  const connectedInputs: string[] = rawData.connectedInputs || [];

  // Logic mapping for requested JSX variables
  const d = {
    ...rawData,
    generatedImageUrl: rawData.runOutput?.imageUrl || rawData.imageUrl,
    isGenerating: rawData.runStatus === "running",
    generationError: rawData.runStatus === "failed",
    imageWidth: rawData.runOutput?.width || rawData.width,
    imageHeight: rawData.runOutput?.height || rawData.height
  };

  // Cooldown logic
  const [timeLeft, setTimeLeft] = useState(0);
  const prevStatusRef = React.useRef(rawData.runStatus);
  
  useEffect(() => {
    const checkCooldown = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((cooldownEnd - now) / 1000));
      setTimeLeft(remaining);
    };

    checkCooldown();
    const timer = setInterval(checkCooldown, 1000);
    return () => clearInterval(timer);
  }, [cooldownEnd]);

  // Trigger cooldown on successful generation ONLY if it transitioned from running
  useEffect(() => {
    if (rawData.runStatus === "success" && prevStatusRef.current === "running") {
      const now = Date.now();
      if (cooldownEnd < now) {
        startCooldown(90);
      }
    }
    prevStatusRef.current = rawData.runStatus;
  }, [rawData.runStatus, cooldownEnd, startCooldown]);

  const isCooldownActive = timeLeft > 0;

  const handleTriggerAction = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isCooldownActive || d.isGenerating) return;

    // Clear all output data to ensure the skeleton shows up immediately
    updateNodeData(id, { 
      runStatus: "idle", 
      runOutput: undefined,
      imageUrl: undefined,
      runError: undefined
    });
    window.dispatchEvent(new CustomEvent("run-single-node", { detail: { nodeId: id } }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <BaseNode
      id={id}
      type="generate-image"
      label={rawData.label || "Generate Image"}
      accentColor="#f43f5e"
      icon={
        <div style={{color:'#f43f5e', fontSize:'12px'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        </div>
      }
      isRunning={d.isGenerating}
      runStatus={rawData.runStatus}
      runError={rawData.runError}
      selected={selected}
    >
      <div style={{display:'flex', flexDirection:'column', gap:'12px', padding:'4px 0'}}>
        {/* 1. Prompt textarea */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">Prompt{connectedInputs.includes('prompt') && <span className="text-red-400 text-[9px]">← connected</span>}</label>
          <textarea
            rows={2}
            className="node-input"
            placeholder="Describe the image you want..."
            value={d.prompt || ''}
            disabled={connectedInputs.includes('prompt')}
            data-connected={connectedInputs.includes('prompt')}
            onChange={e => updateNodeData(id, { prompt: e.target.value })}
          />
        </div>

        {/* 2. Style dropdown */}
        <div>
          <p style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.08em',
            textTransform:'uppercase',color:'var(--text-muted)',marginBottom:'4px'}}>Style</p>
          <select
            className="node-input"
            value={d.style || 'Default'}
            onChange={e => updateNodeData(id, { style: e.target.value })}
          >
            {['Default','Cinematic','Hyper-Realistic','Anime','Artistic','Product Photography'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* 3. Aspect ratio pills */}
        <div>
          <p style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.08em',
            textTransform:'uppercase',color:'var(--text-muted)',marginBottom:'4px'}}>
            Aspect ratio
          </p>
          <div style={{display:'flex',gap:'4px'}}>
            {(['1:1','4:3','16:9','9:16'] as const).map(r => (
              <button
                key={r}
                onClick={() => updateNodeData(id, { aspectRatio: r })}
                style={{
                  flex:1,height:'26px',borderRadius:'5px',cursor:'pointer',
                  fontSize:'10px',fontWeight: d.aspectRatio === r ? 600 : 400,
                  background: d.aspectRatio === r
                    ? 'var(--border)' : 'transparent',
                  border: d.aspectRatio === r
                    ? '1px solid var(--border)'
                    : '1px solid var(--border-subtle)',
                  color: d.aspectRatio === r ? 'var(--text)' : 'var(--text-muted)',
                  transition:'all 100ms ease',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Image preview */}
        {d.generatedImageUrl && !d.isGenerating && (
          <div>
            <div style={{position:'relative',borderRadius:'7px',overflow:'hidden',
              border:'1px solid var(--border-subtle)'}}>
              <img
                src={d.generatedImageUrl}
                alt="generated"
                style={{width:'100%',height:'140px',objectFit:'cover',display:'block'}}
              />
              
              <div style={{
                position:'absolute',bottom:0,left:0,right:0,
                padding:'8px',display:'flex',gap:'4px',alignItems:'center',
                background:'linear-gradient(transparent,rgba(0,0,0,0.75))',
              }} />
            </div>
            <div style={{ display: "flex", gap: 6, paddingTop: "6px" }}>
            <button type="button" onClick={() => {
                    fetch(d.generatedImageUrl)
                      .then(r => r.blob())
                      .then(blob => {
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'generated-image.png'
                        a.click()
                        URL.revokeObjectURL(url)
                      })
                  }} onMouseDown={e => e.stopPropagation()} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500,
              background: "var(--input-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer",
            }}>
              <Download style={{ width: 10, height: 10 }} /> Download
            </button>
            <button type="button" onClick={() => window.open(d.generatedImageUrl, '_blank')} onMouseDown={e => e.stopPropagation()} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500,
              background: "var(--input-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer",
            }}>
              <Maximize2 style={{ width: 10, height: 10 }} /> View full size
            </button>
          </div>
            <div style={{display:'flex',justifyContent:'space-between',
              alignItems:'center',marginTop:'5px'}}>
              <span style={{fontSize:'9px',color:'#22c55e'}}>
                ✓ Generated successfully
              </span>
              <span style={{fontSize:'9px',color:'var(--text-muted)'}}>
                {d.imageWidth && d.imageHeight ? `${d.imageWidth}×${d.imageHeight}` : ''}
              </span>
            </div>
          </div>
        )}

        {/* 5. Loading skeleton */}
        {d.isGenerating && (
          <div style={{
            width:'100%',height:'140px',borderRadius:'7px',
            background:'linear-gradient(90deg,#141414 25%,#1f1f1f 50%,#141414 75%)',
            backgroundSize:'200% 100%',
            animation:'shimmer 1.4s ease-in-out infinite',
          }} />
        )}

        {/* 6. Cooldown State (Added) */}
        {isCooldownActive && !d.isGenerating && (
          <div style={{
            padding: '10px', borderRadius: '10px', background: 'rgba(244,63,94,0.03)',
            border: '1px solid rgba(244,63,94,0.1)', display: 'flex', flexDirection: 'column',
            gap: '8px', animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ position: 'relative', width: '16px', height: '16px' }}>
                  <svg width="16" height="16" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(244,63,94,0.1)" strokeWidth="2" />
                    <circle cx="10" cy="10" r="8" fill="none" stroke="#f43f5e" strokeWidth="2" 
                      strokeDasharray={50.24} 
                      strokeDashoffset={50.24 * (1 - timeLeft / 90)} 
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                    />
                  </svg>
                </div>
                <span style={{ fontSize: '10px', color: '#f43f5e', fontWeight: 600 }}>Generation cooldown</span>
              </div>
              <span style={{ fontSize: '10px', color: '#f43f5e', fontFamily: 'monospace', fontWeight: 700 }}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <p style={{ fontSize: '9px', color: '#666', margin: 0, fontStyle: 'italic' }}>
              Free generation mode active — available shortly
            </p>
          </div>
        )}

        {/* 7. Action Buttons (Updated) */}
        {!d.isGenerating && (
          <div style={{ marginTop: '4px' }}>
            {rawData.runStatus === "failed" ? (
              <div style={{padding:'8px',borderRadius:'6px',textAlign:'center',
                background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.15)'}}>
                <p style={{fontSize:'10px',color:'#f87171',marginBottom:'5px'}}>
                  Generation failed
                </p>
                <button
                  onClick={(e) => handleTriggerAction(e)}
                  onMouseDown={e => e.stopPropagation()}
                  disabled={isCooldownActive}
                  style={{
                    fontSize:'9px', color: isCooldownActive ? 'var(--text-muted)' : 'var(--text-secondary)', background:'transparent',
                    border:'1px solid var(--border)',borderRadius:'4px',
                    padding:'2px 8px', cursor: isCooldownActive ? 'not-allowed' : 'pointer',
                    opacity: isCooldownActive ? 0.5 : 1, transition: 'all 0.2s ease'
                  }}
                  title={isCooldownActive ? `Available in ${formatTime(timeLeft)}` : "Try again"}
                >
                  Try again
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => handleTriggerAction(e)}
                onMouseDown={e => e.stopPropagation()}
                disabled={isCooldownActive}
                style={{
                  width: '100%', height: '32px', borderRadius: '8px',
                  background: isCooldownActive ? 'var(--border-subtle)' : 'rgba(244,63,94,0.1)',
                  border: isCooldownActive ? '1px solid var(--border-subtle)' : '1px solid rgba(244,63,94,0.2)',
                  color: isCooldownActive ? 'var(--text-muted)' : '#f43f5e',
                  fontSize: '11px', fontWeight: 600, cursor: isCooldownActive ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease', opacity: isCooldownActive ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
                title={isCooldownActive ? `Available in ${formatTime(timeLeft)}` : "Generate Image"}
              >
                {isCooldownActive ? <Clock style={{ width: 12, height: 12 }} /> : null}
                {rawData.runOutput || rawData.imageUrl ? 'Regenerate' : 'Generate'}
                {isCooldownActive && ` (${formatTime(timeLeft)})`}
              </button>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
});
