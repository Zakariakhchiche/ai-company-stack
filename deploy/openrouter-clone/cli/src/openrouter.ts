import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, type CoreMessage } from 'ai';
import type { Tool } from './tools/index.js';

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  /** Override base URL — used to route to Ollama Cloud or DeepSeek
   * instead of the OpenRouter default. */
  baseURL?: string;
}

export async function* streamResponse(
  config: OpenRouterConfig,
  messages: CoreMessage[],
  tools: Record<string, any>
) {
  const baseURL =
    config.baseURL ||
    process.env.OPENROUTER_BASE_URL ||
    undefined;
  const openrouter = createOpenRouter({
    apiKey: config.apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  const result = await streamText({
    model: openrouter(config.model),
    messages,
    maxTokens: config.maxTokens || 4096,
    tools,
    toolChoice: 'auto',
  });

  for await (const chunk of result.textStream) {
    yield { type: 'text', content: chunk };
  }

  const response = await result.response;
  yield { type: 'response', response };
}
