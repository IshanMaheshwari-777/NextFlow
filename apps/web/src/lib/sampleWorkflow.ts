import { AppNode, AppEdge, GROQ_DEFAULT_TEXT_MODEL } from "@nextflow/shared/types";

export const SAMPLE_NODES: AppNode[] = [
  {
    id: "sample-upload-image",
    type: "upload-image",
    position: { x: 60, y: 40 },
    data: {
      label: "Product Photo",
      fileUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
      fileName: "headphones.jpg",
      mimeType: "image/jpeg",
      runStatus: "idle",
      connectedInputs: []
    }
  },
  {
    id: "sample-crop-image",
    type: "crop-image",
    position: { x: 420, y: 40 },
    data: {
      label: "Crop Product",
      x_percent: 10,
      y_percent: 5,
      width_percent: 80,
      height_percent: 85,
      runStatus: "idle",
      connectedInputs: ["imageUrl"]
    }
  },
  {
    id: "sample-llm-copywriter",
    type: "llm",
    position: { x: 780, y: 0 },
    data: {
      label: "Product Copywriter",
      model: GROQ_DEFAULT_TEXT_MODEL,
      system_prompt: "You are a world-class e-commerce copywriter. Based on the product image provided, write a compelling 3-sentence product description that highlights benefits, creates desire, and ends with a subtle call to action. Be specific and persuasive.",
      user_message: "Describe this product and write a marketing description.",
      runStatus: "idle",
      connectedInputs: ["images"]
    }
  },
  {
    id: "sample-upload-video",
    type: "upload-video",
    position: { x: 60, y: 780 },
    data: {
      label: "Product Demo Video",
      fileUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      fileName: "product-demo.mp4",
      mimeType: "video/mp4",
      runStatus: "idle",
      connectedInputs: []
    }
  },
  {
    id: "sample-extract-frame",
    type: "extract-frame",
    position: { x: 420, y: 800 },
    data: {
      label: "Extract Demo Frame",
      timestamp: 2,
      runStatus: "idle",
      connectedInputs: ["video_url"]
    }
  },
  {
    id: "sample-llm-launch",
    type: "llm",
    position: { x: 780, y: 820 },
    data: {
      label: "Launch Post Writer",
      model: GROQ_DEFAULT_TEXT_MODEL,
      system_prompt: "You are a senior social media manager. You will receive a product image from a demo video frame. Write a compelling LinkedIn launch post with a strong hook, key benefits, a call to action, and 3 hashtags. Maximum 150 words.",
      user_message: "Write a product launch post based on this product demo frame.",
      runStatus: "idle",
      connectedInputs: ["images", "user_message"]
    }
  }
];

export const SAMPLE_EDGES: AppEdge[] = [
  {
    id: "e-sample-1",
    source: "sample-upload-image",
    sourceHandle: "output",
    target: "sample-crop-image",
    targetHandle: "imageUrl",
    style: { stroke: "#34d399", strokeWidth: 2 }
  },
  {
    id: "e-sample-2",
    source: "sample-crop-image",
    sourceHandle: "output",
    target: "sample-llm-copywriter",
    targetHandle: "images",
    style: { stroke: "#34d399", strokeWidth: 2 }
  },
  {
    id: "e-sample-4",
    source: "sample-upload-video",
    sourceHandle: "output",
    target: "sample-extract-frame",
    targetHandle: "video_url",
    style: { stroke: "#fbbf24", strokeWidth: 2 }
  },
  {
    id: "e-sample-5",
    source: "sample-extract-frame",
    sourceHandle: "output",
    target: "sample-llm-launch",
    targetHandle: "images",
    style: { stroke: "#34d399", strokeWidth: 2 }
  },
  {
    id: "e-sample-6",
    source: "sample-llm-copywriter",
    sourceHandle: "output",
    target: "sample-llm-launch",
    targetHandle: "user_message",
    style: { stroke: "#818cf8", strokeWidth: 2 }
  }
];

/** Zero-setup template: works with no uploads, so it's the fastest way to see a full run. */
export const PROMPT_TO_IMAGE_NODES: AppNode[] = [
  { id: "tpl-idea", type: "text", position: { x: 60, y: 120 }, data: { label: "Your idea", text: "a cozy reading nook inside a treehouse at golden hour", runStatus: "idle", connectedInputs: [] } },
  { id: "tpl-enhance", type: "prompt-enhancer", position: { x: 420, y: 80 }, data: { label: "Enhance Prompt", prompt: "", style: "Cinematic", runStatus: "idle", connectedInputs: ["prompt"] } },
  { id: "tpl-image", type: "generate-image", position: { x: 780, y: 40 }, data: { label: "Generate Image", prompt: "", model: "flux", style: "Cinematic", aspectRatio: "16:9", runStatus: "idle", connectedInputs: ["prompt"] } },
];

export const PROMPT_TO_IMAGE_EDGES: AppEdge[] = [
  { id: "e-tpl-1", source: "tpl-idea", sourceHandle: "output", target: "tpl-enhance", targetHandle: "prompt", style: { stroke: "#818cf8", strokeWidth: 2 } },
  { id: "e-tpl-2", source: "tpl-enhance", sourceHandle: "output", target: "tpl-image", targetHandle: "prompt", style: { stroke: "#818cf8", strokeWidth: 2 } },
];

export const TEMPLATES = {
  "prompt-to-image": { name: "Idea → Image", description: "Turn a one-line idea into a detailed prompt and a generated image. No uploads needed.", nodes: PROMPT_TO_IMAGE_NODES, edges: PROMPT_TO_IMAGE_EDGES },
  "marketing-kit": { name: "Product Marketing Kit", description: "Crop a product photo, grab a frame from a demo video, and write copy for both with vision AI.", nodes: SAMPLE_NODES, edges: SAMPLE_EDGES },
} as const;
export type TemplateId = keyof typeof TEMPLATES;
