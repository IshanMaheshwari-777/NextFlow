import { AppNode, AppEdge } from "@/types";

export const SAMPLE_NODES: AppNode[] = [
  {
    id: "sample-text-product-name",
    type: "text",
    position: { x: 60, y: 160 },
    data: {
      label: "Product Name",
      text: "Wireless Noise-Cancelling Headphones",
      runStatus: "idle",
      connectedInputs: []
    }
  },
  {
    id: "sample-text-product-desc",
    type: "text",
    position: { x: 60, y: 320 },
    data: {
      label: "Product Description",
      text: "Premium audio headphones with 30-hour battery life, foldable design, USB-C fast charging, and adaptive noise cancellation. Available in Midnight Black and Pearl White.",
      runStatus: "idle",
      connectedInputs: []
    }
  },
  {
    id: "sample-llm-tagline",
    type: "llm",
    position: { x: 420, y: 80 },
    data: {
      label: "Tagline Writer",
      model: "llama-3.1-8b-instant",
      system_prompt: "You are a world-class marketing copywriter. Write exactly ONE punchy, memorable product tagline. Maximum 10 words. No explanation, just the tagline.",
      user_message: "",
      runStatus: "idle",
      connectedInputs: ["user_message"]
    }
  },
  {
    id: "sample-llm-features",
    type: "llm",
    position: { x: 420, y: 260 },
    data: {
      label: "Feature Bullets",
      model: "llama-3.1-8b-instant",
      system_prompt: "You are a product marketing specialist. Write exactly 3 compelling bullet points highlighting the product's key benefits. Each bullet point should be one sentence. Format as: • [benefit]",
      user_message: "",
      runStatus: "idle",
      connectedInputs: ["user_message"]
    }
  },
  {
    id: "sample-llm-audience",
    type: "llm",
    position: { x: 420, y: 440 },
    data: {
      label: "Target Audience",
      model: "llama-3.1-8b-instant",
      system_prompt: "You are a marketing strategist. In exactly 2 sentences, describe the ideal target customer for this product. Be specific about demographics, lifestyle, and pain points.",
      user_message: "",
      runStatus: "idle",
      connectedInputs: ["user_message"]
    }
  },
  {
    id: "sample-llm-launch-post",
    type: "llm",
    position: { x: 820, y: 260 },
    data: {
      label: "Launch Post Writer",
      model: "llama-3.1-8b-instant",
      system_prompt: "You are a senior social media manager. You will receive a product tagline, feature bullet points, and target audience description. Combine them into one compelling, ready-to-post product launch post for LinkedIn. Use emojis sparingly. End with 3 relevant hashtags. Keep it under 200 words.",
      user_message: "",
      runStatus: "idle",
      connectedInputs: ["user_message", "system_prompt"]
    }
  }
];

export const SAMPLE_EDGES: AppEdge[] = [
  {
    id: "e-sample-1",
    source: "sample-text-product-name",
    sourceHandle: "output",
    target: "sample-llm-tagline",
    targetHandle: "user_message",
    animated: true,
    style: { stroke: "#6366f1", strokeWidth: 2 }
  },
  {
    id: "e-sample-2",
    source: "sample-text-product-desc",
    sourceHandle: "output",
    target: "sample-llm-features",
    targetHandle: "user_message",
    animated: true,
    style: { stroke: "#6366f1", strokeWidth: 2 }
  },
  {
    id: "e-sample-3",
    source: "sample-text-product-desc",
    sourceHandle: "output",
    target: "sample-llm-audience",
    targetHandle: "user_message",
    animated: true,
    style: { stroke: "#6366f1", strokeWidth: 2 }
  },
  {
    id: "e-sample-4",
    source: "sample-llm-tagline",
    sourceHandle: "output",
    target: "sample-llm-launch-post",
    targetHandle: "user_message",
    animated: true,
    style: { stroke: "#7C5CFF", strokeWidth: 2 }
  },
  {
    id: "e-sample-5",
    source: "sample-llm-features",
    sourceHandle: "output",
    target: "sample-llm-launch-post",
    targetHandle: "user_message",
    animated: true,
    style: { stroke: "#7C5CFF", strokeWidth: 2 }
  },
  {
    id: "e-sample-6",
    source: "sample-llm-audience",
    sourceHandle: "output",
    target: "sample-llm-launch-post",
    targetHandle: "user_message",
    animated: true,
    style: { stroke: "#7C5CFF", strokeWidth: 2 }
  }
];
