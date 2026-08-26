import { getProvider, getProviderKey, getProviderModel, getApiKey, getBaseUrl } from "./config.js";
import { DEFAULT_MODELS, PROVIDER_BASE_URLS } from "./providers.js";
import { sanitizeText } from "./sanitize.js";

/**
 * Stream a chat completion to stdout for interactive feel.
 * Falls back to non-streaming if provider/backend doesn't support it.
 * Returns { response, usage }.
 */
export async function streamChat({ system, messages, onToken }) {
  const provider = getProvider();

  if (provider === "jagx") {
    // JagX backend: non-streaming fetch, then optional fake progressive display
    const key = getApiKey();
    const res = await fetch(`${getBaseUrl()}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        message: messages[messages.length - 1]?.content || "",
        history: messages.slice(0, -1),
        max_tokens: 1800,
      }),
    });
    if (!res.ok) {
      let detail = `API error ${res.status}`;
      try {
        const j = await res.json();
        if (j.detail) detail = j.detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    const data = await res.json();
    const text = sanitizeText(data.response ?? "");
    if (onToken) onToken(text);
    return { response: text, quota: data.quota ?? "", usage: null };
  }

  const apiKey = getProviderKey(provider);
  if (!apiKey) {
    throw new Error(`No API key for ${provider}. Run: jagx config --provider ${provider} --key YOUR_KEY`);
  }
  const model = getProviderModel(provider) || DEFAULT_MODELS[provider];

  if (provider === "anthropic") {
    return streamAnthropic({ apiKey, model, system, messages, onToken });
  }

  const baseUrl = PROVIDER_BASE_URLS[provider];
  const extra =
    provider === "openrouter"
      ? { "HTTP-Referer": "https://npmjs.com/package/jagx-cli", "X-Title": "jagx-cli" }
      : {};
  return streamOpenAICompatible({ baseUrl, apiKey, model, system, messages, onToken, extraHeaders: extra });
}

async function streamAnthropic({ apiKey, model, system, messages, onToken }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-5",
      max_tokens: 1800,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`);
  }

  let full = "";
  let usage = null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() || "";
    for (const line of parts) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "content_block_delta" && ev.delta?.text) {
          const chunk = sanitizeText(ev.delta.text);
          full += chunk;
          if (onToken) onToken(chunk);
        }
        if (ev.type === "message_delta" && ev.usage) {
          usage = {
            inputTokens: ev.usage.input_tokens,
            outputTokens: ev.usage.output_tokens,
          };
        }
      } catch {
        /* ignore partial JSON */
      }
    }
  }
  return { response: full, quota: "", usage };
}

async function streamOpenAICompatible({ baseUrl, apiKey, model, system, messages, onToken, extraHeaders = {} }) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      stream: true,
      messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
  }

  let full = "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() || "";
    for (const line of parts) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        const delta = ev.choices?.[0]?.delta?.content;
        if (delta) {
          const chunk = sanitizeText(delta);
          full += chunk;
          if (onToken) onToken(chunk);
        }
      } catch {
        /* ignore */
      }
    }
  }
  return { response: full, quota: "", usage: null };
}

/**
 * Stream one agent-step completion (text). Used when --stream is on during jagx code.
 * Does not use native tools API (JSON is parsed after full stream) — best for visibility.
 * Falls back to non-streaming sendMessage path via caller if this throws.
 */
export async function streamAgentStep({ system, messages, onToken }) {
  return streamChat({ system, messages, onToken });
}
