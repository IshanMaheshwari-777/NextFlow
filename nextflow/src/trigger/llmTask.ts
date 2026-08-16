import { task, logger } from "@trigger.dev/sdk/v3";
import Groq from "groq-sdk";
import { getEnv } from "../lib/env";
import { GROQ_MODELS, GROQ_DEFAULT_TEXT_MODEL, GROQ_VISION_MODEL } from "../types";

const ALLOWED_MODEL_IDS = new Set<string>(GROQ_MODELS.map(m => m.id));

export const llmTask = task({
  id: "llm-node",
  retry: { maxAttempts: 3, minTimeoutInMs: 1000, maxTimeoutInMs: 10000, factor: 2 },
  run: async (payload: { nodeId: string; workflowRunId: string; model: string; system_prompt?: string; user_message: string; images?: string[] }) => {
    const { nodeId, model, system_prompt, user_message, images = [] } = payload;

    const groq = new Groq({ apiKey: getEnv().GROQ_API_KEY });

    const hasImages = images && images.length > 0;
    // Only ever pass an allowlisted model id to Groq — never the raw client-supplied string.
    const selectedModel = ALLOWED_MODEL_IDS.has(model) ? model : GROQ_DEFAULT_TEXT_MODEL;
    const finalModel = hasImages ? GROQ_VISION_MODEL : selectedModel;

    logger.info("LLM task started", { nodeId, model: finalModel, hasImages, imageCount: images.length });

    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];
    const systemPrompt = system_prompt;
    const userPrompt = user_message || "Describe this image in detail.";

    if (systemPrompt && systemPrompt.trim().length > 0) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    if (hasImages) {
      messages.push({
        role: "user",
        content: [
          ...images.filter(url => typeof url === "string" && url.length > 0).map(url => ({
            type: "image_url" as const,
            image_url: { url },
          })),
          {
            type: "text" as const,
            text: userPrompt,
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: userPrompt,
      });
    }

    try {
      const apiStart = Date.now();
      const response = await groq.chat.completions.create({
        model: finalModel,
        messages,
        max_tokens: 4096,
        // temperature:0,
      });
      const apiTime = Date.now() - apiStart;

      const text = response.choices?.[0]?.message?.content || "";
      logger.info("LLM done", { nodeId, length: text.length, apiTimeMs: apiTime, model: finalModel });
      return { nodeId, success: true, text, model: finalModel, _timing: { apiMs: apiTime } };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("LLM task failed", { nodeId, error: message, stack: err instanceof Error ? err.stack : undefined, model: finalModel });
      throw new Error(`LLM API failed: ${message}`);
    }
  },
});
