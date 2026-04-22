#!/usr/bin/env node
/**
 * Patches the globally-installed paperclipai so the Paperclip UI
 * auto-populates the `hermes_local` model dropdown with whatever
 * Ollama Cloud returns at runtime (no hardcoded catalog).
 *
 * Surgically string-replaces in three files:
 *   1. hermes-paperclip-adapter/dist/server/index.js
 *      — appends an async `listModels()` that fetches `${OLLAMA_BASE_URL}/models`
 *   2. @paperclipai/server/dist/adapters/registry.js
 *      — imports listModels, wires it into the hermes_local registry entry
 *   3. @paperclipai/server/dist/routes/adapters.js
 *      — makes `buildAdapterInfo` async so `modelsCount` reflects
 *        the dynamic listing, and awaits Promise.all in the /adapters route
 *
 * Idempotent: re-running is a no-op once applied.
 *
 * Usage: node patch-hermes-autodetect.mjs <paperclipai_node_modules_dir>
 *   e.g. node patch-hermes-autodetect.mjs /usr/local/lib/node_modules/paperclipai/node_modules
 */
import fs from "node:fs";
import path from "node:path";

const nodeModulesDir = process.argv[2];
if (!nodeModulesDir) {
  console.error("usage: patch-hermes-autodetect.mjs <paperclipai-node_modules>");
  process.exit(2);
}

const hermesPath = path.join(nodeModulesDir, "hermes-paperclip-adapter/dist/server/index.js");
const hermesConstantsPath = path.join(nodeModulesDir, "hermes-paperclip-adapter/dist/shared/constants.js");
const hermesExecutePath = path.join(nodeModulesDir, "hermes-paperclip-adapter/dist/server/execute.js");
const hermesBuildConfigPath = path.join(nodeModulesDir, "hermes-paperclip-adapter/dist/ui/build-config.js");
const registryPath = path.join(nodeModulesDir, "@paperclipai/server/dist/adapters/registry.js");
const routesPath = path.join(nodeModulesDir, "@paperclipai/server/dist/routes/adapters.js");
const approvalsPath = path.join(nodeModulesDir, "@paperclipai/server/dist/services/approvals.js");
const accessPath = path.join(nodeModulesDir, "@paperclipai/server/dist/routes/access.js");
const heartbeatPath = path.join(nodeModulesDir, "@paperclipai/server/dist/services/heartbeat.js");
const routesAgentsPath = path.join(nodeModulesDir, "@paperclipai/server/dist/routes/agents.js");
const servicesAgentsPath = path.join(nodeModulesDir, "@paperclipai/server/dist/services/agents.js");

// ───────────────────────────────────────────────────────────────
// Resilience helpers (warn-not-exit): instead of exiting on a missing
// marker, we log a WARN and continue. This ensures the pc_app container
// still boots even if a single patch rule drifts after a paperclipai
// update. We print a summary at the end so ops can tell which patches
// didn't take.
// ───────────────────────────────────────────────────────────────
const __patchLog = { applied: [], skipped: [], missing: [] };
function warnMissingMarker(label, hint) {
  const line = hint ? `[${label}] MARKER NOT FOUND — ${hint}` : `[${label}] MARKER NOT FOUND`;
  console.warn(line);
  __patchLog.missing.push(label);
}

function readMustExist(p) {
  if (!fs.existsSync(p)) {
    console.error("missing file:", p);
    process.exit(3);
  }
  return fs.readFileSync(p, "utf8");
}

function writeIfChanged(p, newContent, label) {
  const cur = fs.readFileSync(p, "utf8");
  if (cur === newContent) {
    console.log(`[${label}] already patched — skip`);
    return;
  }
  fs.writeFileSync(p, newContent);
  console.log(`[${label}] patched`);
}

// ───────────────────────────────────────────────────────────────
// 1. hermes adapter — append listModels
// ───────────────────────────────────────────────────────────────
const hermesSrc = readMustExist(hermesPath);
const HERMES_LIST_MODELS = `

export async function listModels() {
    const apiKey = process.env.OLLAMA_API_KEY;
    const baseUrl = process.env.OLLAMA_BASE_URL || "https://ollama.com/v1";
    if (!apiKey) return [];
    try {
        const res = await fetch(\`\${baseUrl}/models\`, {
            headers: { Authorization: \`Bearer \${apiKey}\` },
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return [];
        const data = await res.json();
        const models = Array.isArray(data?.data) ? data.data : [];
        return models
            .map((m) => ({ id: m.id, label: \`\${m.id} (Ollama Cloud)\` }))
            .sort((a, b) => a.id.localeCompare(b.id));
    } catch {
        return [];
    }
}
`;
if (hermesSrc.includes("export async function listModels")) {
  console.log("[hermes] already patched — skip");
} else {
  fs.writeFileSync(hermesPath, hermesSrc.trimEnd() + HERMES_LIST_MODELS);
  console.log("[hermes] patched");
}

// ───────────────────────────────────────────────────────────────
// 1b. hermes adapter constants — add "ollama-cloud" to VALID_PROVIDERS
//     so adapterConfig.provider="ollama-cloud" isn't silently dropped.
// ───────────────────────────────────────────────────────────────
let constantsSrc = readMustExist(hermesConstantsPath);
if (constantsSrc.includes('"ollama-cloud"')) {
  console.log("[hermes-constants] already patched — skip");
} else {
  const anchor = '"openrouter",';
  if (!constantsSrc.includes(anchor)) {
    console.error("[hermes-constants] openrouter anchor not found");
    process.exit(4);
  }
  constantsSrc = constantsSrc.replace(anchor, `"openrouter",\n    "ollama-cloud",\n    "custom",`);
  fs.writeFileSync(hermesConstantsPath, constantsSrc);
  console.log("[hermes-constants] patched");
}

// ───────────────────────────────────────────────────────────────
// 2. paperclipai server registry — import & wire listModels
// ───────────────────────────────────────────────────────────────
let registrySrc = readMustExist(registryPath);

const importMarker = 'detectModel as detectModelFromHermes, } from "hermes-paperclip-adapter/server";';
const importReplacement = 'detectModel as detectModelFromHermes, listModels as listHermesModels, } from "hermes-paperclip-adapter/server";';
if (!registrySrc.includes(importReplacement)) {
  if (!registrySrc.includes(importMarker)) {
    console.error("[registry] import marker not found — paperclipai internals may have changed");
    process.exit(4);
  }
  registrySrc = registrySrc.replace(importMarker, importReplacement);
}

const wireMarker = `models: hermesModels,
    supportsLocalAgentJwt: true,`;
const wireReplacement = `models: hermesModels,
    listModels: listHermesModels,
    supportsLocalAgentJwt: true,`;
if (!registrySrc.includes(wireReplacement)) {
  if (!registrySrc.includes(wireMarker)) {
    console.error("[registry] wire marker not found — paperclipai internals may have changed");
    process.exit(5);
  }
  registrySrc = registrySrc.replace(wireMarker, wireReplacement);
}

writeIfChanged(registryPath, registrySrc, "registry");

// ───────────────────────────────────────────────────────────────
// 2b. hermes adapter execute.js — inject PAPERCLIP_API_KEY JWT into
//     the spawned hermes process AND add Authorization headers to
//     every curl in the default prompt template. Without this,
//     hermes's agent curls 401 against its own Paperclip API.
// ───────────────────────────────────────────────────────────────
let hermesExecuteSrc = readMustExist(hermesExecutePath);

const authInjectMarker = `if (taskId)
        env.PAPERCLIP_TASK_ID = taskId;
    const userEnv = config.env;`;
const authInjectReplacement = `if (taskId)
        env.PAPERCLIP_TASK_ID = taskId;
    if (ctx.authToken) {
        env.PAPERCLIP_API_KEY = ctx.authToken;
    }
    const userEnv = config.env;`;

if (hermesExecuteSrc.includes("env.PAPERCLIP_API_KEY = ctx.authToken")) {
  console.log("[hermes-execute-authtoken] already patched — skip");
} else {
  if (!hermesExecuteSrc.includes(authInjectMarker)) {
    console.error("[hermes-execute-authtoken] injection marker not found");
    process.exit(8);
  }
  hermesExecuteSrc = hermesExecuteSrc.replace(authInjectMarker, authInjectReplacement);
}

// Add Authorization header to every `curl -s ` call in the prompt template.
// Safe string replace — `curl -s ` is unique to the template lines.
const curlPlain = 'curl -s ';
const curlAuth = 'curl -s -H "Authorization: Bearer $PAPERCLIP_API_KEY" ';
if (!hermesExecuteSrc.includes(curlAuth)) {
  hermesExecuteSrc = hermesExecuteSrc.split(curlPlain).join(curlAuth);
  console.log("[hermes-execute-curl-auth] patched");
} else {
  console.log("[hermes-execute-curl-auth] already patched — skip");
}

writeIfChanged(hermesExecutePath, hermesExecuteSrc, "hermes-execute");

// ───────────────────────────────────────────────────────────────
// 2c. hermes adapter ui/build-config.js — default provider to
//     "ollama-cloud" so agents created from the Paperclip UI wizard
//     ship with the right routing out of the box. Without this, the
//     UI persists no provider and hermes falls back to modelInference
//     (which picks zai for glm-*, anthropic for claude-*, etc. — and
//     fails if that provider's key isn't configured).
// ───────────────────────────────────────────────────────────────
let hermesBuildConfigSrc = readMustExist(hermesBuildConfigPath);

const providerDefaultMarker = `if (v.model.trim()) {
        ac.model = v.model.trim();
    }`;
const providerDefaultReplacement = `if (v.model.trim()) {
        ac.model = v.model.trim();
    }
    // PATCH: default provider so the Paperclip UI wizard produces agents
    // that route correctly to Ollama Cloud. DeepSeek-prefixed models keep
    // their explicit "deepseek" provider (handled in execute.ts).
    if (!ac.provider) {
        const m = (ac.model || "").toLowerCase();
        ac.provider = m.startsWith("deepseek/") ? "deepseek" : "ollama-cloud";
    }`;

if (hermesBuildConfigSrc.includes("PATCH: default provider")) {
  console.log("[hermes-buildconfig] already patched — skip");
} else {
  if (!hermesBuildConfigSrc.includes(providerDefaultMarker)) {
    console.error("[hermes-buildconfig] marker not found");
    process.exit(9);
  }
  hermesBuildConfigSrc = hermesBuildConfigSrc.replace(providerDefaultMarker, providerDefaultReplacement);
  writeIfChanged(hermesBuildConfigPath, hermesBuildConfigSrc, "hermes-buildconfig");
}

// ───────────────────────────────────────────────────────────────
// 3. paperclipai routes/adapters.js — async buildAdapterInfo + await Promise.all
// ───────────────────────────────────────────────────────────────
let routesSrc = readMustExist(routesPath);

const buildFnMarker = `function buildAdapterInfo(adapter, externalRecord, disabledSet) {
    const fromDisk = externalRecord ? readAdapterPackageVersionFromDisk(externalRecord) : undefined;
    return {
        type: adapter.type,
        label: adapter.type, // ServerAdapterModule doesn't have a separate "label" field; type serves as label
        source: externalRecord ? "external" : "builtin",
        modelsCount: (adapter.models ?? []).length,`;

const buildFnReplacement = `async function buildAdapterInfo(adapter, externalRecord, disabledSet) {
    const fromDisk = externalRecord ? readAdapterPackageVersionFromDisk(externalRecord) : undefined;
    let __dynamicCount = 0;
    if (typeof adapter.listModels === "function") {
        try {
            const __discovered = await adapter.listModels();
            __dynamicCount = Array.isArray(__discovered) ? __discovered.length : 0;
        } catch {}
    }
    const __staticCount = (adapter.models ?? []).length;
    return {
        type: adapter.type,
        label: adapter.type, // ServerAdapterModule doesn't have a separate "label" field; type serves as label
        source: externalRecord ? "external" : "builtin",
        modelsCount: Math.max(__dynamicCount, __staticCount),`;

// Idempotency: any async buildAdapterInfo referencing adapter.listModels
// is treated as "already patched". This accommodates small stylistic drift
// from prior manual patches.
const routesAlreadyPatched =
  /async function buildAdapterInfo/.test(routesSrc) &&
  /adapter\.listModels/.test(routesSrc);
if (!routesAlreadyPatched) {
  if (!routesSrc.includes(buildFnMarker)) {
    console.error("[routes] buildAdapterInfo marker not found");
    process.exit(6);
  }
  routesSrc = routesSrc.replace(buildFnMarker, buildFnReplacement);

  const mapMarker = `const result = registeredAdapters.map((adapter) => buildAdapterInfo(adapter, externalRecords.get(adapter.type), disabledSet)).sort((a, b) => a.type.localeCompare(b.type));`;
  const mapReplacement = `const result = (await Promise.all(registeredAdapters.map((adapter) => buildAdapterInfo(adapter, externalRecords.get(adapter.type), disabledSet)))).sort((a, b) => a.type.localeCompare(b.type));`;
  if (!routesSrc.includes(mapMarker)) {
    console.error("[routes] map marker not found");
    process.exit(7);
  }
  routesSrc = routesSrc.replace(mapMarker, mapReplacement);
}

writeIfChanged(routesPath, routesSrc, "routes");

// ───────────────────────────────────────────────────────────────
// 4. paperclipai services/approvals.js — make hire_agent approvals
//    default to hermes_local + ollama-cloud instead of "process"
//    with an empty config. Without this, every "hire CTO/Engineer/..."
//    approval creates a broken agent that fails on first heartbeat.
// ───────────────────────────────────────────────────────────────
let approvalsSrc = readMustExist(approvalsPath);

const approvalsMarker = `adapterType: String(payload.adapterType ?? "process"),
                        adapterConfig: typeof payload.adapterConfig === "object" && payload.adapterConfig !== null
                            ? payload.adapterConfig
                            : {},`;
const approvalsReplacement = `adapterType: String(payload.adapterType ?? "hermes_local"),
                        adapterConfig: (typeof payload.adapterConfig === "object" && payload.adapterConfig !== null && Object.keys(payload.adapterConfig).length > 0)
                            ? payload.adapterConfig
                            : { model: "glm-5.1", provider: "ollama-cloud", timeoutSec: 1800, graceSec: 15, persistSession: true, quiet: true },`;

if (approvalsSrc.includes('provider: "ollama-cloud"')) {
  console.log("[approvals] already patched — skip");
} else {
  if (!approvalsSrc.includes(approvalsMarker)) {
    console.error("[approvals] marker not found");
    process.exit(10);
  }
  approvalsSrc = approvalsSrc.replace(approvalsMarker, approvalsReplacement);
  writeIfChanged(approvalsPath, approvalsSrc, "approvals");
}

// ───────────────────────────────────────────────────────────────
// 5. paperclipai routes/access.js — same default fix for agents
//    created via the join-request acceptance path. Without this,
//    any agent joining through an invite link gets adapterType=process
//    and an empty config too.
// ───────────────────────────────────────────────────────────────
let accessSrc = readMustExist(accessPath);

const accessMarker = `adapterType: existing.adapterType ?? "process",
                adapterConfig: existing.agentDefaultsPayload &&
                    typeof existing.agentDefaultsPayload === "object"
                    ? existing.agentDefaultsPayload
                    : {},`;
const accessReplacement = `adapterType: existing.adapterType ?? "hermes_local",
                adapterConfig: (existing.agentDefaultsPayload &&
                    typeof existing.agentDefaultsPayload === "object" &&
                    Object.keys(existing.agentDefaultsPayload).length > 0)
                    ? existing.agentDefaultsPayload
                    : { model: "glm-5.1", provider: "ollama-cloud", timeoutSec: 1800, graceSec: 15, persistSession: true, quiet: true },`;

if (accessSrc.includes('provider: "ollama-cloud"')) {
  console.log("[access] already patched — skip");
} else {
  if (!accessSrc.includes(accessMarker)) {
    console.error("[access] marker not found");
    process.exit(11);
  }
  accessSrc = accessSrc.replace(accessMarker, accessReplacement);
  writeIfChanged(accessPath, accessSrc, "access");
}

// ───────────────────────────────────────────────────────────────
// 6. paperclipai services/heartbeat.js — bump default
//    maxConcurrentRuns from 1 to 4 so multiple agents can run in
//    parallel instead of queuing behind each other.
// ───────────────────────────────────────────────────────────────
let heartbeatSrc = readMustExist(heartbeatPath);

const hbRegex = /const HEARTBEAT_MAX_CONCURRENT_RUNS_DEFAULT = \d+;/;
const hbReplacement = "const HEARTBEAT_MAX_CONCURRENT_RUNS_DEFAULT = 7;";

if (heartbeatSrc.includes(hbReplacement)) {
  console.log("[heartbeat] already patched — skip");
} else if (!hbRegex.test(heartbeatSrc)) {
  console.error("[heartbeat] marker not found");
  process.exit(12);
} else {
  heartbeatSrc = heartbeatSrc.replace(hbRegex, hbReplacement);
  writeIfChanged(heartbeatPath, heartbeatSrc, "heartbeat");
}

// ───────────────────────────────────────────────────────────────
// 7. paperclipai routes/agents.js — default direct POST agent
//    creation to hermes_local + ollama-cloud. Catches the API flow
//    (curl, automations, agents creating other agents) which bypasses
//    UI wizard + approvals + invites. Warn-not-exit: if markers drift
//    the container still boots.
// ───────────────────────────────────────────────────────────────
if (fs.existsSync(routesAgentsPath)) {
  let routesAgentsSrc = fs.readFileSync(routesAgentsPath, "utf8");

  // Already-applied sentinel: any occurrence of our injected defaults.
  const sentinel = '"ollama-cloud"';
  if (routesAgentsSrc.includes(sentinel) && /adapterType:\s*["']hermes_local["']/.test(routesAgentsSrc)) {
    console.log("[routes-agents] already patched — skip");
    __patchLog.skipped.push("routes-agents");
  } else {
    // Pattern A: `adapterType: payload.adapterType ?? "process"`
    // Pattern B: `adapterType: String(payload.adapterType ?? "process")`
    // Pattern C: `adapterType: body.adapterType ?? "process"`
    const adapterTypeRx = /adapterType:\s*(String\()?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\?\?\s*"process"(\))?/g;
    const adapterConfigRx = /adapterConfig:\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\?\?\s*\{\s*\}/g;
    // More literal fallback pattern for `: {},` after `adapterConfig:` with ternary
    const ternaryEmptyConfigRx =
      /adapterConfig:\s*typeof\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*===\s*"object"\s*&&\s*\1\s*!==\s*null\s*\?\s*\1\s*:\s*\{\s*\}/g;

    let changed = false;
    const OLL_DEFAULT = '{ model: "glm-5.1", provider: "ollama-cloud", timeoutSec: 1800, graceSec: 15, persistSession: true, quiet: true }';

    const beforeA = routesAgentsSrc;
    routesAgentsSrc = routesAgentsSrc.replace(adapterTypeRx, (m, s, expr, c) =>
      `adapterType: ${s ? "String(" : ""}${expr} ?? "hermes_local"${s ? ")" : ""}`
    );
    if (routesAgentsSrc !== beforeA) { changed = true; }

    const beforeB = routesAgentsSrc;
    routesAgentsSrc = routesAgentsSrc.replace(adapterConfigRx, (m, expr) =>
      `adapterConfig: (${expr} && Object.keys(${expr}).length > 0) ? ${expr} : ${OLL_DEFAULT}`
    );
    if (routesAgentsSrc !== beforeB) { changed = true; }

    const beforeC = routesAgentsSrc;
    routesAgentsSrc = routesAgentsSrc.replace(ternaryEmptyConfigRx, (m, expr) =>
      `adapterConfig: (typeof ${expr} === "object" && ${expr} !== null && Object.keys(${expr}).length > 0) ? ${expr} : ${OLL_DEFAULT}`
    );
    if (routesAgentsSrc !== beforeC) { changed = true; }

    if (changed) {
      writeIfChanged(routesAgentsPath, routesAgentsSrc, "routes-agents");
      __patchLog.applied.push("routes-agents");
    } else {
      warnMissingMarker("routes-agents", "no adapterType/adapterConfig fallback pattern found in routes/agents.js");
    }
  }
} else {
  warnMissingMarker("routes-agents", `file not present at ${routesAgentsPath}`);
}

// ───────────────────────────────────────────────────────────────
// 8. paperclipai services/agents.js — same defaults at the service
//    layer. Paperclip may normalize creates through a central service
//    even when the route skips that path. Tolerant regex; no-op if
//    nothing matches.
// ───────────────────────────────────────────────────────────────
if (fs.existsSync(servicesAgentsPath)) {
  let servicesAgentsSrc = fs.readFileSync(servicesAgentsPath, "utf8");

  const alreadyPatched = servicesAgentsSrc.includes('"ollama-cloud"');
  if (alreadyPatched) {
    console.log("[services-agents] already patched — skip");
    __patchLog.skipped.push("services-agents");
  } else {
    const adapterTypeRx = /adapterType:\s*(String\()?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\?\?\s*"process"(\))?/g;
    const emptyConfigFallbackRx =
      /adapterConfig:\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\?\?\s*\{\s*\}/g;

    const OLL_DEFAULT = '{ model: "glm-5.1", provider: "ollama-cloud", timeoutSec: 1800, graceSec: 15, persistSession: true, quiet: true }';

    let changed = false;
    const before1 = servicesAgentsSrc;
    servicesAgentsSrc = servicesAgentsSrc.replace(adapterTypeRx, (m, s, expr, c) =>
      `adapterType: ${s ? "String(" : ""}${expr} ?? "hermes_local"${s ? ")" : ""}`
    );
    if (servicesAgentsSrc !== before1) { changed = true; }
    const before2 = servicesAgentsSrc;
    servicesAgentsSrc = servicesAgentsSrc.replace(emptyConfigFallbackRx, (m, expr) =>
      `adapterConfig: (${expr} && Object.keys(${expr}).length > 0) ? ${expr} : ${OLL_DEFAULT}`
    );
    if (servicesAgentsSrc !== before2) { changed = true; }

    if (changed) {
      writeIfChanged(servicesAgentsPath, servicesAgentsSrc, "services-agents");
      __patchLog.applied.push("services-agents");
    } else {
      warnMissingMarker("services-agents", "no adapterType/adapterConfig fallback pattern found in services/agents.js");
    }
  }
} else {
  warnMissingMarker("services-agents", `file not present at ${servicesAgentsPath}`);
}

// ───────────────────────────────────────────────────────────────
// Final summary — ops can read this in /tmp/pc.log to know what
// drifted. Non-zero exit reserved for catastrophic failures only.
// ───────────────────────────────────────────────────────────────
console.log("");
console.log("=== patch summary ===");
console.log("applied  :", __patchLog.applied.join(", ") || "(none)");
console.log("skipped  :", __patchLog.skipped.join(", ") || "(none)");
console.log("missing  :", __patchLog.missing.join(", ") || "(none)");
console.log("=====================");
console.log("done.");
