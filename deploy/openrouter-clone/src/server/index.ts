/**
 * Server barrel for the Ollama Cloud + DeepSeek adapter.
 *
 * Exposes everything Paperclip's server-side registry expects from a
 * fully-featured adapter:
 *   - execute             — the agent run loop (tool-calling)
 *   - testEnvironment     — env diagnostics + model fetch
 *   - sessionCodec        — persist/restore lastGenerationId across heartbeats
 *   - detectModel         — read OLLAMA_MODEL / DEEPSEEK_MODEL env if present
 *   - listSkills          — minimal stub (filesystem scan)
 *   - syncSkills          — no-op (skills are managed externally)
 */

import path from "node:path";
import fs from "node:fs/promises";
import type {
  AdapterSessionCodec,
  AdapterSkillContext,
  AdapterSkillSnapshot,
} from "@paperclipai/adapter-utils";

export { execute } from "./execute.js";
export { testEnvironment, listOpenRouterModels } from "./test.js";

// ----- sessionCodec -----

/**
 * OpenRouter doesn't have first-class server-side sessions; we persist the
 * last generation id so the run viewer can show a stable display id and
 * future versions can chain conversations across heartbeats.
 */
export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw) {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    const id = typeof obj.lastGenerationId === "string" ? obj.lastGenerationId : null;
    if (!id) return null;
    return { lastGenerationId: id };
  },
  serialize(params) {
    if (!params || typeof params !== "object") return null;
    const id = typeof params.lastGenerationId === "string" ? params.lastGenerationId : null;
    if (!id) return null;
    return { lastGenerationId: id };
  },
  getDisplayId(params) {
    if (!params || typeof params !== "object") return null;
    const id = (params as Record<string, unknown>).lastGenerationId;
    return typeof id === "string" ? id : null;
  },
};

// ----- detectModel -----

/**
 * Best-effort detection: prefer explicit env vars, then fall back to the
 * first entry of the hardcoded Ollama Cloud catalog.
 */
export async function detectModel(): Promise<{
  model: string;
  provider: string;
  source: string;
} | null> {
  const deepseekEnv = process.env.DEEPSEEK_MODEL;
  if (deepseekEnv && deepseekEnv.trim().length > 0) {
    return { model: deepseekEnv.trim(), provider: "deepseek", source: "env:DEEPSEEK_MODEL" };
  }
  const ollamaEnv = process.env.OLLAMA_MODEL || process.env.OPENROUTER_MODEL;
  if (ollamaEnv && ollamaEnv.trim().length > 0) {
    return { model: ollamaEnv.trim(), provider: "ollama", source: "env:OLLAMA_MODEL" };
  }
  return { model: "gpt-oss:120b-cloud", provider: "ollama", source: "default" };
}

// ----- listSkills / syncSkills -----

/**
 * Minimal skill listing. We scan the same root our skill loader uses
 * (~/.openrouter-adapter/skills by default) and report each subdirectory
 * containing a SKILL.md as an external skill.
 *
 * v1 doesn't track desired-vs-installed because we don't sync from
 * Paperclip's managed skill store yet — that's a v3 feature.
 */
function defaultSkillsRoot(): string {
  const home = process.env.HOME || process.env.USERPROFILE || ".";
  return path.join(home, ".openrouter-adapter", "skills");
}

export async function listSkills(_ctx: AdapterSkillContext): Promise<AdapterSkillSnapshot> {
  const root = process.env.PAPERCLIP_SKILLS_DIR?.trim() || defaultSkillsRoot();
  const snapshot: AdapterSkillSnapshot = {
    adapterType: "ollama-cloud",
    supported: true,
    mode: "ephemeral",
    desiredSkills: [],
    entries: [],
    warnings: [],
  };

  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    snapshot.warnings.push(`Skills root ${root} not present.`);
    return snapshot;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const skillDir = path.join(root, entry.name);
    const skillMd = path.join(skillDir, "SKILL.md");
    let hasSkillMd = true;
    try {
      await fs.access(skillMd);
    } catch {
      hasSkillMd = false;
    }
    if (!hasSkillMd) continue;
    snapshot.entries.push({
      key: entry.name,
      runtimeName: entry.name,
      desired: true,
      managed: false,
      state: "external",
      origin: "external_unknown",
      sourcePath: skillDir,
      targetPath: skillDir,
    });
  }

  return snapshot;
}

export async function syncSkills(
  ctx: AdapterSkillContext,
  _desiredSkills: string[],
): Promise<AdapterSkillSnapshot> {
  // v1: skills are managed externally (operator drops them in skillsRoot).
  // We just return the current listing — no copy/sync work.
  return listSkills(ctx);
}
