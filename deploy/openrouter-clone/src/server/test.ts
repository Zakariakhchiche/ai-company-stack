// ─────────────────────────────────────────────────────────────────
// @paperclipai/adapter-ollama-cloud — Server Test (Environment Check)
// Matches real Paperclip AdapterEnvironmentTestContext / Result
// ─────────────────────────────────────────────────────────────────

import type {
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
  AdapterEnvironmentCheck,
} from "@paperclipai/adapter-utils";
import {
  DEFAULT_FALLBACK_MODEL,
  DEEPSEEK_MODELS_ENDPOINT,
  OLLAMA_MODELS_ENDPOINT,
  providerBaseUrl,
  providerModelsEndpoint,
  resolveApiKey,
  resolveProvider,
  normalizeModelId,
  type OpenRouterConfig,
  type OpenRouterModel,
  type Provider,
} from "../index.js";

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = ctx.config as unknown as OpenRouterConfig;

  const selectedModel = config.model || DEFAULT_FALLBACK_MODEL;
  const provider = resolveProvider(selectedModel);
  const baseUrl = providerBaseUrl(provider);

  // ── 1. Check API key for the resolved provider ────────────────
  const apiKey = resolveApiKey(provider, config);

  if (!apiKey) {
    const envName = provider === "deepseek" ? "DEEPSEEK_API_KEY" : "OLLAMA_API_KEY";
    const fieldName = provider === "deepseek" ? "deepseekApiKey" : "ollamaApiKey";
    checks.push({
      code: `${provider}_api_key_missing`,
      level: "error",
      message: `No ${provider === "deepseek" ? "DeepSeek" : "Ollama Cloud"} API key found`,
      detail: `Set adapterConfig.${fieldName} or ${envName} environment variable.`,
      hint:
        provider === "deepseek"
          ? "Get a key at https://platform.deepseek.com/api_keys"
          : "Get a key at https://ollama.com/settings/keys",
    });
    return {
      adapterType: "ollama-cloud",
      status: "fail",
      checks,
      testedAt: new Date().toISOString(),
    };
  }

  checks.push({
    code: `${provider}_api_key_found`,
    level: "info",
    message: `${provider === "deepseek" ? "DeepSeek" : "Ollama Cloud"} key found: ${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`,
  });

  // ── 2. Live /v1/models call ───────────────────────────────────
  try {
    const modelsEndpoint = providerModelsEndpoint(provider);
    const res = await fetch(modelsEndpoint, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      checks.push({
        code: `${provider}_api_error`,
        level: "error",
        message: `${baseUrl} returned ${res.status}`,
        detail: errText.slice(0, 200),
      });
      return {
        adapterType: "ollama-cloud",
        status: "fail",
        checks,
        testedAt: new Date().toISOString(),
      };
    }

    const data = (await res.json()) as { data?: OpenRouterModel[] };
    const remoteModels = data.data || [];

    checks.push({
      code: `${provider}_connected`,
      level: "info",
      message: `Connected to ${baseUrl} — ${remoteModels.length} models available live`,
    });

    // ── 3. Verify the selected model is really there ──────────────
    const wireId = normalizeModelId(selectedModel);
    const found = remoteModels.some((m) => m.id === wireId);
    if (found) {
      checks.push({
        code: `${provider}_model_verified`,
        level: "info",
        message: `Provider confirms "${wireId}" is available`,
      });
    } else if (remoteModels.length > 0) {
      checks.push({
        code: `${provider}_model_not_found`,
        level: "warn",
        message: `Provider did not list "${wireId}" — may be deprecated or name mismatch`,
      });
    }

    const hasErrors = checks.some((c) => c.level === "error");
    const hasWarnings = checks.some((c) => c.level === "warn");

    return {
      adapterType: "ollama-cloud",
      status: hasErrors ? "fail" : hasWarnings ? "warn" : "pass",
      checks,
      testedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    checks.push({
      code: `${provider}_connection_failed`,
      level: "error",
      message: `Failed to connect to ${baseUrl}: ${err.message || err}`,
    });
    return {
      adapterType: "ollama-cloud",
      status: "fail",
      checks,
      testedAt: new Date().toISOString(),
    };
  }
}

// ── Dynamic model picker ──────────────────────────────────────────
// Paperclip calls this when `dynamic: true` is set on the model field.
// We query BOTH providers in parallel and merge, so whatever is live at
// each provider shows up in the dropdown. No hardcoded catalog.

async function fetchProviderModels(
  provider: Provider,
  apiKey: string,
  timeoutMs = 10000,
): Promise<{ id: string; label: string }[]> {
  const endpoint =
    provider === "deepseek" ? DEEPSEEK_MODELS_ENDPOINT : OLLAMA_MODELS_ENDPOINT;
  try {
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: OpenRouterModel[] };
    const models = data.data || [];
    const tag = provider === "deepseek" ? "DeepSeek" : "Ollama Cloud";
    return models.map((m) => ({
      id: provider === "deepseek" ? `deepseek/${m.id}` : m.id,
      label: `${m.id} (${tag})`,
    }));
  } catch {
    return [];
  }
}

/**
 * Autodetect available models from both providers.
 * Ollama Cloud entries keep their bare id (e.g. `gpt-oss:120b`).
 * DeepSeek entries are prefixed with `deepseek/` so the adapter routes them
 * to api.deepseek.com instead of ollama.com.
 */
export async function listOpenRouterModels(): Promise<{ id: string; label: string }[]> {
  const ollamaKey = process.env.OLLAMA_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  const [ollamaModels, deepseekModels] = await Promise.all([
    ollamaKey ? fetchProviderModels("ollama", ollamaKey) : Promise.resolve([]),
    deepseekKey ? fetchProviderModels("deepseek", deepseekKey) : Promise.resolve([]),
  ]);

  const merged = [...ollamaModels, ...deepseekModels];
  merged.sort((a, b) => a.label.localeCompare(b.label));
  return merged;
}
