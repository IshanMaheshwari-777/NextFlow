import { NodeType, GROQ_DEFAULT_TEXT_MODEL } from "@nextflow/shared/types";

/** Single source of truth for a freshly-created node's default `data` payload. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
export function defaultNodeData(type: NodeType): Record<string, any> {
  switch (type) {
    case "text": return { label: "Text", text: "" };
    case "upload-image": return { label: "Upload Image" };
    case "upload-video": return { label: "Upload Video" };
    case "llm": return { label: "Run LLM", model: GROQ_DEFAULT_TEXT_MODEL, system_prompt: "", user_message: "" };
    case "crop-image": return { label: "Crop Image", x_percent: 0, y_percent: 0, width_percent: 100, height_percent: 100 };
    case "extract-frame": return { label: "Extract Frame", timestamp: 0 };
    case "generate-image": return { label: "Generate Image", prompt: "", model: "flux", style: "Default", aspectRatio: "1:1" };
    case "prompt-enhancer": return { label: "Enhance Prompt", prompt: "", style: "Cinematic" };
    case "video-enhance": return { label: "Video Enhance", video_url: "", resolution: "1080p", strength: "medium" };
    default: return { label: "Node" };
  }
}
