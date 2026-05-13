import { task, logger } from "@trigger.dev/sdk/v3";
import Groq from "groq-sdk";

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const GROQ_MODELS: Record<string, string> = {
  "llama-3.3-70b-versatile": "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant": "llama-3.1-8b-instant",
  // Allow any model string to pass through
};

export const llmTask = task({
  id: "llm-node",
  retry: { maxAttempts: 3, minTimeoutInMs: 1000, maxTimeoutInMs: 10000, factor: 2 },
  run: async (payload: { nodeId: string; workflowRunId: string; model: string; system_prompt?: string; user_message: string; images?: string[] }) => {
    const { nodeId, model, system_prompt, user_message, images = [] } = payload;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Auto-switch to Scout vision model when images are connected
    const hasImages = images && images.length > 0;
    const resolvedModel = hasImages
      ? VISION_MODEL
      : (GROQ_MODELS[model] || model || "llama-3.1-8b-instant");

    logger.info("LLM task started", { nodeId, model: resolvedModel, hasImages, imageCount: images.length });

    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (system_prompt && system_prompt.trim().length > 0) {
      messages.push({ role: "system", content: system_prompt });
    }

    // Build user message content
    if (hasImages) {
      // Multimodal: send images + text using Groq's OpenAI-compatible format
      const contentParts: Groq.Chat.Completions.ChatCompletionContentPartImage[] = images.map(url => ({
        type: "image_url" as const,
        image_url: { url },
      }));
      messages.push({
        role: "user",
        content: [
          ...contentParts,
          { type: "text" as const, text: user_message || "Describe this image in detail." },
        ],
      });
    } else {
      messages.push({ role: "user", content: user_message });
    }

    const apiStart = Date.now();
    const response = await groq.chat.completions.create({
      model: resolvedModel,
      messages,
      max_tokens: 4096,
    });
    const apiTime = Date.now() - apiStart;

    const text = response.choices?.[0]?.message?.content || "";
    logger.info("LLM done", { nodeId, length: text.length, apiTimeMs: apiTime, model: resolvedModel });
    return { nodeId, success: true, text, model: resolvedModel, _timing: { apiMs: apiTime } };
  },
});
