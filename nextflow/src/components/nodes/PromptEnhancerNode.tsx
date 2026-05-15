"use client";
import React, { memo } from "react";
import { NodeProps } from "@xyflow/react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";

export default memo(function PromptEnhancerNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useWorkflowStore();
  const rawData = data as any;
  const connectedInputs: string[] = rawData.connectedInputs || [];

  // Logic mapping for requested JSX variables
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
        
          {/* <p style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.08em',
            textTransform:'uppercase',color:'#555',marginBottom:'4px',
            display:'flex',alignItems:'center',gap:'6px'}}>
            Source Prompt
            {connectedInputs.includes('prompt') && (
              <span style={{display:'flex',alignItems:'center',gap:'3px',
                fontSize:'9px',color:'#4f8cff',fontWeight:400,
                textTransform:'none',letterSpacing:0}}>
                <span style={{width:'5px',height:'5px',borderRadius:'50%',
                  background:'#4f8cff',display:'inline-block'}}/>
                connected
              </span>
            )}
          </p> */}
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
            textTransform:'uppercase',color:'#555',marginBottom:'4px'}}>
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
          <div>
            <p style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.08em',
              textTransform:'uppercase',color:'#555',marginBottom:'4px'}}>
              Enhanced Prompt
            </p>
            <div style={{background:'#0d0d0d',border:'1px solid rgba(255,255,255,0.07)',
              borderRadius:'5px',padding:'7px 8px'}}>
              <p style={{fontSize:'10px',color:'#888',lineHeight:1.55,margin:0}}>
                {d.result}
              </p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(d.result)}
              style={{marginTop:'5px',display:'flex',alignItems:'center',gap:'3px',
                padding:'3px 8px',borderRadius:'4px',fontSize:'9px',
                background:'transparent',border:'1px solid rgba(255,255,255,0.1)',
                color:'#555',cursor:'pointer'}}
            >
              Copy
            </button>
          </div>
        )}

        {/* 4. Loading skeleton */}
        {d.isRunning && !d.result && (
          <div>
            <p style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.08em',
              textTransform:'uppercase',color:'#555',marginBottom:'4px'}}>
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
