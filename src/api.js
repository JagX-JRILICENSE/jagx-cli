import { getApiKey, getBaseUrl, getProvider, getProviderKey, getProviderModel } from "./config.js";
import {
  callAnthropic,
  callOpenAICompatible,
  DEFAULT_MODELS,
  PROVIDER_BASE_URLS,
  AGENT_TOOLS,
} from "./providers.js";
import { sanitizeText } from "./sanitize.js";
import { recordUsage } from "./ledger.js";

export const MODES = [
  "core",
  "engineer",
  "researcher",
  "architect",
  "creator",
  "operator",
  "analyst",
  "educator",
  "strategist",
  "scholar",
  "legal",
  "designer",
  "guardian",
];

const MODE_SYSTEM = {
  core: "You are a helpful, direct general-purpose assistant.",
  engineer:
    "You are an expert software engineer. Provide complete, clean, runnable code with brief explanations.",
  researcher:
    "Provide well-researched, evidence-led answers. Be precise about what is and isn't certain.",
  architect: "Think about systems, scalability, and architecture. Give structured, practical advice.",
  creator: "Be creative, original, and clear. Help with writing, naming, and content.",
  operator: "Give exact commands, scripts, and clear step-by-step terminal instructions.",
  analyst: "Focus on data and metrics. Break down numbers clearly and highlight the key takeaway.",
  educator: "Explain concepts simply and patiently, like a great tutor. Build up step by step.",
  strategist: "Think in terms of goals, tradeoffs, and practical next steps.",
  scholar: "Give thorough, rigorous, well-reasoned answers considering multiple angles.",
  legal:
    "Help with document structure and clarity. Always note you are not a lawyer and this is not legal advice.",
  designer: "Give specific UI/UX and visual design feedback — layout, hierarchy, usability.",
  guardian: "Review code and systems for security issues. Focus on defensive fixes, explained clearly.",
};

function systemForMode(mode) {
  return MODE_SYSTEM[mode] || MODE_SYSTEM.core;
}

async function sendViaJagxBackend(message, history, mode) {
  const key = getApiKey();
  const res = await fetch(`${getBaseUrl()}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify({ message, history, max_tokens: 1800 }),
  });

  if (!res.ok) {
    let detail = `API error ${res.status}`;
    try {
      const j = await res.json();
      if (j.detail) detail = j.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  const data = await res.json();
  return {
    response: sanitizeText(data.response ?? ""),
    quota: data.quota ?? "",
    usage: null,
    structured: false,
  };
}

async function sendViaExternalProvider(provider, message, history, mode, { tools = null } = {}) {
  const apiKey = getProviderKey(provider);
  if (!apiKey) {
    throw new Error(
      `No API key set for ${provider}. Run: jagx config --provider ${provider} --key YOUR_KEY`,
    );
  }
  const model = getProviderModel(provider) || DEFAULT_MODELS[provider];
  const system = systemForMode(mode);
  const messages = [...history, { role: "user", content: message }];

  let result;
  if (provider === "anthropic") {
    result = await callAnthropic(apiKey, model, system, messages, 1800, tools);
  } else {
    const extraHeaders =
      provider === "openrouter"
        ? { "HTTP-Referer": "https://npmjs.com/package/jagx-cli", "X-Title": "jagx-cli" }
        : {};
    result = await callOpenAICompatible(
      PROVIDER_BASE_URLS[provider],
      apiKey,
      model,
      system,
      messages,
      1800,
      extraHeaders,
      tools,
    );
  }
  return {
    response: sanitizeText(result.text),
    quota: "",
    usage: result.usage,
    structured: !!result.structured,
  };
}

/**
 * @param {string} message
 * @param {Array} history
 * @param {string} mode
 * @param {{ agentTools?: boolean, workdir?: string }} [opts]
 */
export async function sendMessage(message, history, mode, opts = {}) {
  const provider = getProvider();
  const tools =
    opts.agentTools && provider !== "jagx"
      ? AGENT_TOOLS
      : null;

  let out;
  if (provider === "jagx") out = await sendViaJagxBackend(message, history, mode);
  else out = await sendViaExternalProvider(provider, message, history, mode, { tools });

  if (out.usage) {
    try {
      recordUsage({
        workdir: opts.workdir || process.cwd(),
        provider,
        model: getProviderModel(provider) || DEFAULT_MODELS[provider] || "",
        usage: out.usage,
      });
    } catch { /* ignore ledger errors */ }
  }
  return out;
}

export { AGENT_TOOLS };
