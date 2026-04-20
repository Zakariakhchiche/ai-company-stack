// ─────────────────────────────────────────────────────────────────
// @paperclipai/adapter-ollama-cloud — UI Build Config
// Converts onboarding/settings form values → adapterConfig JSON.
//
// The same `configFields` list is rendered by Paperclip in:
//   · the first-run onboarding wizard
//   · the agent-creation / agent-edit form
// so any field added here appears in both places.
//
// Model picker is fully dynamic (`dynamic: true`) — the UI calls the
// server's listOpenRouterModels() which autodetects models live from
// Ollama Cloud and DeepSeek via their /v1/models endpoints.
// ─────────────────────────────────────────────────────────────────

import { DEFAULT_FALLBACK_MODEL, resolveProvider } from "../index.js";

export interface OpenRouterFormValues {
  model?: string;
  /** Legacy — pre-dual-provider agents used a single key. Still accepted. */
  apiKey?: string;
  ollamaApiKey?: string;
  deepseekApiKey?: string;
  systemPrompt?: string;
  temperature?: string;
  maxTokens?: string;
  topP?: string;
  stream?: string | boolean;
  reasoning?: string | boolean;
  transforms?: string;
  route?: string;
  httpReferer?: string;
  xTitle?: string;
}

export function buildConfig(
  formValues: OpenRouterFormValues
): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  // Required
  config.model = formValues.model || DEFAULT_FALLBACK_MODEL;

  // Dual-provider keys — at least one must be present for the chosen model.
  if (formValues.ollamaApiKey) config.ollamaApiKey = formValues.ollamaApiKey;
  if (formValues.deepseekApiKey) config.deepseekApiKey = formValues.deepseekApiKey;

  // Legacy single-key field — stored if the user still supplies it.
  if (formValues.apiKey) config.apiKey = formValues.apiKey;

  if (formValues.systemPrompt) config.systemPrompt = formValues.systemPrompt;

  if (formValues.temperature !== undefined && formValues.temperature !== "") {
    config.temperature = parseFloat(formValues.temperature);
  }
  if (formValues.maxTokens !== undefined && formValues.maxTokens !== "") {
    config.maxTokens = parseInt(formValues.maxTokens, 10);
  }
  if (formValues.topP !== undefined && formValues.topP !== "") {
    config.topP = parseFloat(formValues.topP);
  }

  config.stream = formValues.stream === true || formValues.stream === "true";
  if (formValues.reasoning === true || formValues.reasoning === "true") {
    config.reasoning = true;
  }

  if (formValues.transforms) {
    config.transforms = formValues.transforms
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  if (formValues.route && ["fallback", "no-fallback"].includes(formValues.route)) {
    config.route = formValues.route;
  }

  if (formValues.httpReferer) config.httpReferer = formValues.httpReferer;
  if (formValues.xTitle) config.xTitle = formValues.xTitle;

  config.provider = resolveProvider(config.model as string);

  return config;
}

/**
 * Define the config form fields for Paperclip's UI.
 *
 * Order matters: Paperclip renders fields top-to-bottom in the onboarding
 * wizard, so API keys come first (the operator's "API keys tab" on a fresh
 * VPS), then the model picker (dynamic — auto-fills from the live provider
 * listings), then the tuning options.
 */
export const configFields = [
  {
    key: "ollamaApiKey",
    label: "Ollama Cloud API Key",
    type: "password" as const,
    placeholder: "ollama-xxxxxxxxxxxxxxxx",
    required: false,
    helpText:
      "Get your key at https://ollama.com/settings/keys. Required to list/call " +
      "Ollama Cloud models. Falls back to OLLAMA_API_KEY env var on the host.",
  },
  {
    key: "deepseekApiKey",
    label: "DeepSeek API Key",
    type: "password" as const,
    placeholder: "sk-xxxxxxxxxxxxxxxx",
    required: false,
    helpText:
      "Get your key at https://platform.deepseek.com/api_keys. Required only to list/call " +
      "DeepSeek models. Falls back to DEEPSEEK_API_KEY env var on the host.",
  },
  {
    key: "model",
    label: "Model",
    type: "select" as const,
    placeholder: DEFAULT_FALLBACK_MODEL,
    required: true,
    dynamic: true, // UI autodetects via listOpenRouterModels() server endpoint
    helpText:
      "Auto-detected from Ollama Cloud and DeepSeek. Any model id " +
      "prefixed with 'deepseek/' routes to DeepSeek's own API.",
  },
  {
    key: "systemPrompt",
    label: "System Prompt",
    type: "textarea" as const,
    placeholder: "You are a helpful assistant working for {{company_name}}...",
    required: false,
  },
  {
    key: "temperature",
    label: "Temperature",
    type: "number" as const,
    placeholder: "0.7",
    required: false,
    min: 0,
    max: 2,
    step: 0.1,
  },
  {
    key: "maxTokens",
    label: "Max Tokens",
    type: "number" as const,
    placeholder: "4096",
    required: false,
    min: 1,
    max: 200000,
  },
  {
    key: "stream",
    label: "Enable Streaming",
    type: "toggle" as const,
    defaultValue: true,
  },
  {
    key: "reasoning",
    label: "Enable Reasoning (extended thinking)",
    type: "toggle" as const,
    defaultValue: false,
    helpText: "Only honored by reasoning-capable models (DeepSeek Reasoner, GPT-OSS, Kimi K2 Thinking).",
  },
];
