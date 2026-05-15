export type NodeType = "text" | "upload-image" | "upload-video" | "llm" | "crop-image" | "extract-frame" | "generate-image" | "prompt-enhancer";
export type HandleType = "text" | "image" | "video" | "any";
export type HandleDef = { id: string; label: string; type: HandleType; required?: boolean };

export type AppNode = {
  selected?: boolean;
  id: string; type: NodeType;
  position: { x: number; y: number };
  data: Record<string, any>;
};
export type AppEdge = { id: string; source: string; sourceHandle: string; target: string; targetHandle: string; animated?: boolean; style?: Record<string, any> };

export type RunStatus = "running" | "success" | "failed" | "partial";
export type NodeRunRecord = { id: string; nodeId: string; nodeType: string; nodeLabel?: string; status: string; startedAt: string; completedAt?: string; duration?: number; inputs?: any; output?: any; error?: string };
export type WorkflowRunRecord = { id: string; workflowId: string; status: string; runMode: string; selectedNodeIds: string[]; startedAt: string; completedAt?: string; duration?: number; error?: string; nodeRuns: NodeRunRecord[]; createdAt: string };

export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Versatile)" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Fast)" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout (Vision)" },
] as const;

export const NODE_HANDLES: Record<NodeType, { inputs: HandleDef[]; outputs: HandleDef[] }> = {
  text: { inputs: [], outputs: [{ id: "output", label: "Text", type: "text" }] },
  "upload-image": { inputs: [], outputs: [{ id: "output", label: "Image URL", type: "image" }] },
  "upload-video": { inputs: [], outputs: [{ id: "output", label: "Video URL", type: "video" }] },
  llm: { inputs: [{ id: "system_prompt", label: "System Prompt", type: "text" }, { id: "user_message", label: "User Message", type: "text" }, { id: "images", label: "Images", type: "image" }], outputs: [{ id: "output", label: "Response", type: "text" }] },
  "crop-image": { inputs: [{ id: "imageUrl", label: "Image", type: "image", required: true }], outputs: [{ id: "output", label: "Cropped Image", type: "image" }] },
  "extract-frame": { inputs: [{ id: "video_url", label: "Video", type: "video", required: true }], outputs: [{ id: "output", label: "Frame Image", type: "image" }] },
  "generate-image": { inputs: [{ id: "prompt", label: "Prompt", type: "text", required: true }], outputs: [{ id: "output", label: "Generated Image", type: "image" }] },
  "prompt-enhancer": { inputs: [{ id: "prompt", label: "Raw Prompt", type: "text", required: true }], outputs: [{ id: "output", label: "Enhanced Prompt", type: "text" }] },
};

export const HANDLE_COMPAT: Record<HandleType, HandleType[]> = {
  text: ["text", "any"], image: ["image", "any"], video: ["video", "any"], any: ["text", "image", "video", "any"],
};

export const SIDEBAR_NODES = [
  { type: "text" as NodeType, label: "Text", description: "Simple text input", icon: "Type", color: "#6366f1" },
  { type: "upload-image" as NodeType, label: "Upload Image", description: "jpg, png, webp, gif", icon: "Image", color: "#10b981" },
  { type: "upload-video" as NodeType, label: "Upload Video", description: "mp4, mov, webm, mkv", icon: "Video", color: "#f59e0b" },
  { type: "llm" as NodeType, label: "Run LLM", description: "Groq (Llama / Scout Vision)", icon: "Sparkles", color: "#8b5cf6" },
  { type: "crop-image" as NodeType, label: "Crop Image", description: "Trim to region", icon: "Crop", color: "#ef4444" },
  { type: "extract-frame" as NodeType, label: "Extract Frame", description: "Frame from video", icon: "Film", color: "#ec4899" },
  { type: "generate-image" as NodeType, label: "Generate Image", description: "Pollinations.ai / Flux", icon: "ImagePlus", color: "#f43f5e" },
  { type: "prompt-enhancer" as NodeType, label: "Enhance Prompt", description: "AI prompt engineering", icon: "Wand2", color: "#3b82f6" },
];
