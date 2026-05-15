import { task, logger } from "@trigger.dev/sdk/v3";
import Groq from "groq-sdk";

const GROQ_MODELS: Record<string, string> = {
  "llama-3.1-8b-instant": "llama-3.1-8b-instant",
  "meta-llama/llama-4-scout-17b-16e-instruct": "meta-llama/llama-4-scout-17b-16e-instruct",
};

export const llmTask = task({
  id: "llm-node",
  retry: { maxAttempts: 3, minTimeoutInMs: 1000, maxTimeoutInMs: 10000, factor: 2 },
  run: async (payload: { nodeId: string; workflowRunId: string; model: string; system_prompt?: string; user_message: string; images?: string[] }) => {
    const { nodeId, model, system_prompt, user_message, images = [] } = payload;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const hasImages = images && images.length > 0;
    const selectedModel = GROQ_MODELS[model] || model || "llama-3.1-8b-instant";
    const finalModel = hasImages
      ? "meta-llama/llama-4-scout-17b-16e-instruct"
      : selectedModel;

    logger.info("LLM task started", { nodeId, model: finalModel, hasImages, imageCount: images.length });

    let messages: any[] = [];
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
            type: "image_url",
            image_url: { url },
          })),
          {
            type: "text",
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
      });
      const apiTime = Date.now() - apiStart;

      const text = response.choices?.[0]?.message?.content || "";
      logger.info("LLM done", { nodeId, length: text.length, apiTimeMs: apiTime, model: finalModel });
      return { nodeId, success: true, text, model: finalModel, _timing: { apiMs: apiTime } };
    } catch (err: any) {
      logger.error("LLM task failed", { nodeId, error: err?.message, stack: err?.stack, model: finalModel });
      throw new Error(`LLM API failed: ${err?.message || "Unknown error"}`);
    }
  },
});
