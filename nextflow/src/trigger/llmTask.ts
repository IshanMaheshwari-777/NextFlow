import { task, logger } from "@trigger.dev/sdk/v3";
import Groq from "groq-sdk";

const GROQ_MODELS: Record<string, string> = {
  "llama-3.3-70b-versatile": "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant": "llama-3.1-8b-instant",
  "mixtral-8x7b-32768": "mixtral-8x7b-32768",
  // Allow any model string to pass through
};

export const llmTask = task({
  id: "llm-node",
  retry: { maxAttempts: 3, minTimeoutInMs: 1000, maxTimeoutInMs: 10000, factor: 2 },
  run: async (payload: { nodeId: string; workflowRunId: string; model: string; system_prompt?: string; user_message: string; images?: string[] }) => {
    const { nodeId, model, system_prompt, user_message, images = [] } = payload;
    logger.info("LLM task started", { nodeId, model });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const resolvedModel = GROQ_MODELS[model] || model || "llama-3.1-8b-instant";

    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (system_prompt && system_prompt.trim().length > 0) {
      messages.push({ role: "system", content: system_prompt });
    }

    // Build user message content
    // Groq supports image URLs via content parts for vision models
    if (images.length > 0) {
      const contentParts: Groq.Chat.Completions.ChatCompletionContentPartImage[] = images.map(url => ({
        type: "image_url" as const,
        image_url: { url },
      }));
      messages.push({
        role: "user",
        content: [
          ...contentParts,
          { type: "text" as const, text: user_message },
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
