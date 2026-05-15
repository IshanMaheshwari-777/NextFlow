"use client";
import React, { memo } from "react";
import { NodeProps } from "@xyflow/react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { Crop, Download, Maximize2 } from "lucide-react";
export default memo(function GenerateImageNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useWorkflowStore();
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

  const handleTriggerAction = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Clear all output data to ensure the skeleton shows up immediately
    updateNodeData(id, { 
      runStatus: "idle", 
      runOutput: undefined,
      imageUrl: undefined,
      runError: undefined
    });
    window.dispatchEvent(new CustomEvent("run-single-node", { detail: { nodeId: id } }));
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
        
          {/* <p style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.08em',
            textTransform:'uppercase',color:'#555',marginBottom:'4px'}}>
            Prompt
            {connectedInputs.includes('prompt') && (
              <span style={{marginLeft:'6px',fontSize:'9px',color:'#4f8cff',
                fontWeight:400,textTransform:'none',letterSpacing:0}}>
                ← connected
              </span>
            )}
          </p> */}
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
            textTransform:'uppercase',color:'#555',marginBottom:'4px'}}>Style</p>
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
            textTransform:'uppercase',color:'#555',marginBottom:'4px'}}>
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
                    ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: d.aspectRatio === r
                    ? '1px solid rgba(255,255,255,0.2)'
                    : '1px solid rgba(255,255,255,0.07)',
                  color: d.aspectRatio === r ? '#e8e8e8' : '#555',
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
              border:'1px solid rgba(255,255,255,0.07)'}}>
              <img
                src={d.generatedImageUrl}
                alt="generated"
                style={{width:'100%',height:'140px',objectFit:'cover',display:'block'}}
              />
              
              
              <div style={{
                position:'absolute',bottom:0,left:0,right:0,
                padding:'8px',display:'flex',gap:'4px',alignItems:'center',
                background:'linear-gradient(transparent,rgba(0,0,0,0.75))',
              }}>
                {/* <button
                  onClick={() => {
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
                  }}
                  style={{display:'flex',alignItems:'center',gap:'3px',
                    padding:'3px 7px',borderRadius:'4px',fontSize:'9px',
                    background:'rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.15)',
                    color:'#ddd',cursor:'pointer'}}
                >
                  ↓ Download
                </button> */}
                {/* <button
                  onClick={() => window.open(d.generatedImageUrl, '_blank')}
                  style={{display:'flex',alignItems:'center',gap:'3px',
                    padding:'3px 7px',borderRadius:'4px',fontSize:'9px',
                    background:'rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.15)',
                    color:'#ddd',cursor:'pointer'}}
                >
                  ↗ Full size
                </button> */}
                {/* <button
                  onClick={(e) => handleTriggerAction(e)}
                  onMouseDown={e => e.stopPropagation()}
                  style={{marginLeft:'auto',width:'22px',height:'22px',borderRadius:'4px',
                    background:'rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.15)',
                    color:'#aaa',cursor:'pointer',fontSize:'12px',display:'flex',
                    alignItems:'center',justifyContent:'center'}}
                >
                  ↻
                </button> */}
              </div>
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
              background: "#16161f", color: "#8b8b9e", border: "1px solid #1e1e2a", cursor: "pointer",
            }}>
              <Download style={{ width: 10, height: 10 }} /> Download
            </button>
            <button type="button" onClick={() => window.open(d.generatedImageUrl, '_blank')} onMouseDown={e => e.stopPropagation()} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500,
              background: "#16161f", color: "#8b8b9e", border: "1px solid #1e1e2a", cursor: "pointer",
            }}>
              <Maximize2 style={{ width: 10, height: 10 }} /> View full size
            </button>
          </div>
            <div style={{display:'flex',justifyContent:'space-between',
              alignItems:'center',marginTop:'5px'}}>
              <span style={{fontSize:'9px',color:'#22c55e'}}>
                ✓ Generated successfully
              </span>
              <span style={{fontSize:'9px',color:'#444'}}>
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

        {/* 6. Error state */}
        {d.generationError && !d.isGenerating && (
          <div style={{padding:'8px',borderRadius:'6px',textAlign:'center',
            background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.15)'}}>
            <p style={{fontSize:'10px',color:'#f87171',marginBottom:'5px'}}>
              Generation failed
            </p>
            <button
              onClick={(e) => handleTriggerAction(e)}
              onMouseDown={e => e.stopPropagation()}
              style={{fontSize:'9px',color:'#888',background:'transparent',
                border:'1px solid rgba(255,255,255,0.1)',borderRadius:'4px',
                padding:'2px 8px',cursor:'pointer'}}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </BaseNode>
  );
});
