import OpenAI from "openai";
import type { LlmConfig } from "../types/llm.js";
import { logger } from "./logger.js";

/**
 * Generates text from a configured LLM using the standard OpenAI-compatible
 * chat completions API.
 *
 * @param config - LLM connection and model configuration.
 * @param prompt - The full prompt string to send as a user message.
 * @returns The trimmed text response from the model.
 * @throws If the model returns an empty response or the API call fails.
 */
export async function generateTextWithLlm(config: LlmConfig, prompt: string): Promise<string> {
  logger.debug("llm", `generate, model=${config.model}, prompt_len=${prompt.length}`);

  try {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiUrl,
    });

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const output = response.choices[0]?.message?.content?.trim() ?? "";
    logger.debug("llm", `response received, len=${output.length}`);

    if (!output) {
      throw new Error("LLM returned empty response.");
    }
    return output;
  } catch (err) {
    logger.error("llm", "generation failed", err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}
