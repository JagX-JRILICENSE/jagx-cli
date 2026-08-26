import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CONFIG_DIR = path.join(os.homedir(), ".jagx");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

// Shared demo key — rate-limited on the backend (60 req/hr, free tier). Lets users try
// jagx-cli with zero setup. For higher limits: jagx config --key YOUR_OWN_KEY
const DEFAULT_API_KEY = "jagx-adb6112fe4192539858e02fae18053d1";

export function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveConfig(partial) {
  const current = loadConfig();
  const next = { ...current, ...partial };
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2));
  return next;
}

export function getApiKey() {
  return process.env.JAGX_API_KEY || loadConfig().apiKey || DEFAULT_API_KEY;
}

export function usingDemoKey() {
  return !process.env.JAGX_API_KEY && !loadConfig().apiKey;
}

export function getBaseUrl() {
  return process.env.JAGX_BASE_URL || loadConfig().baseUrl || "https://jagx-ai-v2.onrender.com";
}

export function getDefaultMode() {
  return loadConfig().mode || "core";
}

export function getProvider() {
  return loadConfig().provider || "jagx";
}

export function setProvider(provider, apiKey, model) {
  const current = loadConfig();
  const providerKeys = current.providerKeys || {};
  const providerModels = current.providerModels || {};
  if (apiKey) providerKeys[provider] = apiKey;
  if (model) providerModels[provider] = model;
  return saveConfig({ provider, providerKeys, providerModels });
}

export function getProviderKey(provider) {
  return loadConfig().providerKeys?.[provider] || process.env[`${provider.toUpperCase()}_API_KEY`] || null;
}

export function getProviderModel(provider) {
  return loadConfig().providerModels?.[provider] || null;
}
