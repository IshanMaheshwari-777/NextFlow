import { AppNode, AppEdge } from "@/types";

export const SAMPLE_NODES: AppNode[] = [
  {
    id: "sample-upload-image",
    type: "upload-image",
    position: { x: 60, y: 60 },
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
    position: { x: 440, y: 60 },
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
    position: { x: 720, y: 60 },
    data: {
      label: "Product Copywriter",
      model: "llama-3.3-8b-instant",
      system_prompt: "You are a world-class e-commerce copywriter. Based on the product image provided, write a compelling 3-sentence product description that highlights benefits, creates desire, and ends with a subtle call to action. Be specific and persuasive.",
      user_message: "Describe this product and write a marketing description.",
      runStatus: "idle",
      connectedInputs: ["images"]
    }
  },
  {
    id: "sample-upload-video",
    type: "upload-video",
    position: { x: 60, y: 460 },
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
    position: { x: 340, y: 460 },
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
    position: { x: 720, y: 440 },
    data: {
      label: "Launch Post Writer",
      model: "llama-3.3-70b-versatile",
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
    animated: true,
    style: { stroke: "#10b981", strokeWidth: 2 }
  },
  {
    id: "e-sample-2",
    source: "sample-crop-image",
    sourceHandle: "output",
    target: "sample-llm-copywriter",
    targetHandle: "images",
    animated: true,
    style: { stroke: "#10b981", strokeWidth: 2 }
  },
  {
    id: "e-sample-4",
    source: "sample-upload-video",
    sourceHandle: "output",
    target: "sample-extract-frame",
    targetHandle: "video_url",
    animated: true,
    style: { stroke: "#f59e0b", strokeWidth: 2 }
  },
  {
    id: "e-sample-5",
    source: "sample-extract-frame",
    sourceHandle: "output",
    target: "sample-llm-launch",
    targetHandle: "images",
    animated: true,
    style: { stroke: "#10b981", strokeWidth: 2 }
  },
  {
    id: "e-sample-6",
    source: "sample-llm-copywriter",
    sourceHandle: "output",
    target: "sample-llm-launch",
    targetHandle: "user_message",
    animated: true,
    style: { stroke: "#7C5CFF", strokeWidth: 2 }
  }
];
