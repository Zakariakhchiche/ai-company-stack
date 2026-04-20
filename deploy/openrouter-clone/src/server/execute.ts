// ─────────────────────────────────────────────────────────────────
// @paperclipai/adapter-ollama-cloud — execute()
//
// Minimal, up-to-date against @paperclipai/adapter-utils 2026.x.
// Spawns the bundled CLI (which uses the OpenRouter AI SDK) against
// either Ollama Cloud (default) or DeepSeek (when model has the
// `deepseek/` prefix) and pipes stdout/stderr back to Paperclip.
// ─────────────────────────────────────────────────────────────────

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "@paperclipai/adapter-utils";
import { renderPaperclipWakePrompt } from "@paperclipai/adapter-utils/server-utils";

import {
  DEFAULT_FALLBACK_MODEL,
  providerBaseUrl,
  resolveApiKey,
  resolveProvider,
  normalizeModelId,
  type OpenRouterConfig,
} from "../index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, "../../cli/dist/index.js");

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function execute(
  ctx: AdapterExecutionContext,
): Promise<AdapterExecutionResult> {
  const { config: rawConfig, context, onLog, authToken } = ctx;
  const config = rawConfig as unknown as OpenRouterConfig;

  const rawModelId = config.model || DEFAULT_FALLBACK_MODEL;
  const provider = resolveProvider(rawModelId);
  const baseUrl = providerBaseUrl(provider);
  const wireModelId = normalizeModelId(rawModelId);
  const apiKey = resolveApiKey(provider, config) || authToken || "";

  if (!apiKey) {
    const envName = provider === "deepseek" ? "DEEPSEEK_API_KEY" : "OLLAMA_API_KEY";
    await onLog("stderr", `[adapter] no API key for provider ${provider}; set ${envName} or adapterConfig.${provider}ApiKey\n`);
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorCode: `${provider}_api_key_missing`,
      errorMessage: `no API key found for provider ${provider}`,
      model: rawModelId,
      provider,
    };
  }

  let prompt: string;
  try {
    prompt = renderPaperclipWakePrompt(context);
  } catch (err) {
    await onLog("stderr", `[adapter] failed to render wake prompt: ${err}\n`);
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: `render wake prompt failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const cliArgs = [
    CLI_PATH,
    "--print",
    "--output-format", "stream-json",
    "--model", wireModelId,
    "--max-tokens", String(config.maxTokens || 4096),
  ];

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    OPENROUTER_API_KEY: apiKey,
    OPENROUTER_BASE_URL: baseUrl,
  };

  return new Promise<AdapterExecutionResult>((resolve) => {
    const child = spawn("node", cliArgs, {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let outputTokens = 0;

    child.stdin.write(prompt);
    child.stdin.end();

    child.stdout.on("data", async (chunk: Buffer) => {
      const text = chunk.toString();
      await onLog("stdout", text);
      // Crude token accounting from CLI's stream-json events.
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        try {
          const ev = JSON.parse(line);
          if (ev?.type === "assistant" && typeof ev.content === "string") {
            outputTokens += Math.ceil(ev.content.length / 4);
          }
        } catch {
          // non-JSON line, ignore
        }
      }
    });

    child.stderr.on("data", async (chunk: Buffer) => {
      await onLog("stderr", chunk.toString());
    });

    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, DEFAULT_TIMEOUT_MS);

    child.on("error", async (err) => {
      clearTimeout(timeoutHandle);
      await onLog("stderr", `[adapter] spawn error: ${err.message}\n`);
      resolve({
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage: `spawn error: ${err.message}`,
        model: rawModelId,
        provider,
      });
    });

    child.on("close", (exitCode, signal) => {
      clearTimeout(timeoutHandle);
      const inputTokens = Math.ceil(prompt.length / 4);
      resolve({
        exitCode,
        signal: signal ? String(signal) : null,
        timedOut,
        usage: { inputTokens, outputTokens },
        model: rawModelId,
        provider,
      });
    });
  });
}
