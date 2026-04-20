// ─────────────────────────────────────────────────────────────────
// @paperclipai/adapter-ollama-cloud — Root Metadata (src/index.ts)
// Dual-provider adapter: Ollama Cloud + DeepSeek (OpenAI-compatible)
// Shared across server · ui · cli — keep dependency-free
// ─────────────────────────────────────────────────────────────────

export const type = "ollama-cloud" as const;
export const label = "Ollama Cloud + DeepSeek";

// ── Provider constants ──────────────────────────────────────────
export const OLLAMA_BASE_URL = "https://ollama.com/v1";
export const OLLAMA_MODELS_ENDPOINT = `${OLLAMA_BASE_URL}/models`;
export const OLLAMA_CHAT_ENDPOINT = `${OLLAMA_BASE_URL}/chat/completions`;

export const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
export const DEEPSEEK_MODELS_ENDPOINT = `${DEEPSEEK_BASE_URL}/models`;
export const DEEPSEEK_CHAT_ENDPOINT = `${DEEPSEEK_BASE_URL}/chat/completions`;

// Kept for backward compat with server/execute.ts usage metric calls.
// Ollama Cloud and DeepSeek do not expose a generation endpoint — calls
// against this URL silently fail and usage is left as zero.
export const OPENROUTER_BASE_URL = OLLAMA_BASE_URL;
export const OPENROUTER_MODELS_ENDPOINT = OLLAMA_MODELS_ENDPOINT;
export const OPENROUTER_CHAT_ENDPOINT = OLLAMA_CHAT_ENDPOINT;
export const OPENROUTER_GENERATION_ENDPOINT = `${OLLAMA_BASE_URL}/generation`;

// ── No hardcoded catalog ─────────────────────────────────────────
// The model picker is fully dynamic: `listOpenRouterModels()` in
// src/server/test.ts calls GET /v1/models on both providers at runtime
// and returns whatever is live. This array stays empty as a sentinel
// for Paperclip's registry (some code paths check its length).
export const models: { id: string; label: string }[] = [];

// The UI falls back to this model id if the user hasn't picked anything
// yet and the live listing hasn't come back. Chosen as the most common
// general-purpose Ollama Cloud model at build time.
export const DEFAULT_FALLBACK_MODEL = "gpt-oss:120b";

// ── Provider routing ────────────────────────────────────────────
export type Provider = "ollama" | "deepseek";

export function resolveProvider(modelId: string): Provider {
  return modelId.startsWith("deepseek/") ? "deepseek" : "ollama";
}

export function providerBaseUrl(provider: Provider): string {
  return provider === "deepseek" ? DEEPSEEK_BASE_URL : OLLAMA_BASE_URL;
}

export function providerModelsEndpoint(provider: Provider): string {
  return provider === "deepseek"
    ? DEEPSEEK_MODELS_ENDPOINT
    : OLLAMA_MODELS_ENDPOINT;
}

/**
 * Strip the `deepseek/` prefix used to route models internally, so the
 * literal model id sent to DeepSeek's API stays valid (e.g. `deepseek-chat`).
 * Ollama ids are returned unchanged.
 */
export function normalizeModelId(modelId: string): string {
  return modelId.startsWith("deepseek/")
    ? modelId.slice("deepseek/".length)
    : modelId;
}

/**
 * Pick the API key for a given provider, honoring this priority:
 *   1. per-agent config (ollamaApiKey / deepseekApiKey)
 *   2. legacy single `apiKey` field
 *   3. env vars OLLAMA_API_KEY / DEEPSEEK_API_KEY
 */
export function resolveApiKey(
  provider: Provider,
  config: { apiKey?: string; ollamaApiKey?: string; deepseekApiKey?: string }
): string | undefined {
  if (provider === "deepseek") {
    return (
      config.deepseekApiKey ||
      config.apiKey ||
      process.env.DEEPSEEK_API_KEY ||
      undefined
    );
  }
  return (
    config.ollamaApiKey ||
    config.apiKey ||
    process.env.OLLAMA_API_KEY ||
    undefined
  );
}

// ── Adapter documentation ───────────────────────────────────────
export const agentConfigurationDoc = `# ollama-cloud adapter configuration

## Use when
- You want hosted inference on Ollama Cloud (GPT-OSS, Kimi K2, Qwen3 Coder, GLM, DeepSeek V3.1…)
- You want DeepSeek's own API (deepseek-chat, deepseek-reasoner) with the same adapter
- You want a single adapter with both providers so the VPS never needs code changes

## Core fields
- \`model\` (string) — pick from the hardcoded catalog. Ids without prefix route to
  Ollama Cloud; ids starting with \`deepseek/\` route to DeepSeek's API.
- \`ollamaApiKey\` (string) — Ollama Cloud key (ollama.com/settings/keys)
  Falls back to OLLAMA_API_KEY env var.
- \`deepseekApiKey\` (string) — DeepSeek key (platform.deepseek.com)
  Falls back to DEEPSEEK_API_KEY env var.
- \`systemPrompt\` (string, optional)
- \`temperature\` (number, optional, 0-2)
- \`maxTokens\` (number, optional)
- \`topP\` (number, optional)
- \`stream\` (boolean, optional)
- \`reasoning\` (boolean, optional) — only honored by deepseek-reasoner / GPT-OSS
`;

// ── Types ───────────────────────────────────────────────────────
export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
    request?: string;
    image?: string;
  };
  context_length: number;
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: Record<string, string> | null;
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type: string | null;
  };
}

export interface OpenRouterConfig {
  model: string;
  /** @deprecated kept so existing agents keep working — use ollamaApiKey/deepseekApiKey instead. */
  apiKey?: string;
  ollamaApiKey?: string;
  deepseekApiKey?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  reasoning?: boolean;
  transforms?: string[];
  route?: "fallback" | "no-fallback";
  httpReferer?: string;
  xTitle?: string;
  /** Max tool-loop turns per run. Default 25. */
  maxTurns?: number;
  /** Skip approval gates for hire_agent and similar mutating tools. Default false. */
  autoApprove?: boolean;
  /** Override path to skills directory. Defaults to ~/.openrouter-adapter/skills. */
  skillsDir?: string;
  /** Absolute path to a markdown file that will be read at runtime and
   * prepended to the system prompt. Takes precedence over systemPrompt
   * if both are set. */
  instructionsFilePath?: string;
  /** Working directory for spawned CLI (set by Paperclip). */
  cwd?: string;
}
