import { config } from "../config.js";
import { logger } from "./logger.js";

const llmLogger = logger.child("LLM");

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function llm(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 2048
): Promise<string> {
  const messages: OpenRouterMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  llmLogger.debug(`Calling OpenRouter model: ${config.openrouter.model}`);

  const response = await fetch(`${config.openrouter.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.openrouter.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://religion.fun",
      "X-Title": "SanctumForge Religious Persuasion Agent",
    },
    body: JSON.stringify({
      model: config.openrouter.model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    llmLogger.error(`OpenRouter API error: ${response.status}`, errorBody);
    throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`);
  }

  const data = (await response.json()) as OpenRouterResponse;

  if (!data.choices || data.choices.length === 0) {
    llmLogger.error("OpenRouter returned no choices");
    throw new Error("OpenRouter returned no choices");
  }

  const content = data.choices[0].message.content;

  if (data.usage) {
    llmLogger.debug(
      `Tokens — prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens}, total: ${data.usage.total_tokens}`
    );
  }

  return content;
}
