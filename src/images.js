import fs from "node:fs";
import path from "node:path";
import { getProvider, getProviderKey, getProviderModel } from "./config.js";
import { PROVIDER_BASE_URLS } from "./providers.js";

/**
 * Generate an image via OpenRouter (or OpenAI-compatible image API).
 * Saves under workdir/assets/ or .jagx/images/
 */
export async function generateImage(workdir, { prompt, filename }) {
  const provider = getProvider();
  const key = getProviderKey(provider === "jagx" ? "openrouter" : provider) || getProviderKey("openrouter") || getProviderKey("openai");
  if (!key) {
    throw new Error(
      "Image generation needs an OpenRouter or OpenAI key. Run: jagx config --provider openrouter --key sk-or-...",
    );
  }

  const useOpenRouter = provider === "openrouter" || !getProviderKey("openai");
  const base = useOpenRouter ? PROVIDER_BASE_URLS.openrouter : PROVIDER_BASE_URLS.openai;
  const model = useOpenRouter
    ? "google/gemini-2.0-flash-exp:free"
    : "dall-e-3";

  // OpenRouter image generation varies; try chat-based image URL models first isn't stable.
  // Use OpenAI images API shape when openai key; for openrouter try /images/generations if supported.
  const url = `${base}/images/generations`;
  const body = useOpenRouter
    ? { model: "openai/dall-e-3", prompt: prompt.slice(0, 1000), n: 1, size: "1024x1024" }
    : { model: "dall-e-3", prompt: prompt.slice(0, 1000), n: 1, size: "1024x1024" };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
      ...(useOpenRouter
        ? { "HTTP-Referer": "https://npmjs.com/package/jagx-cli", "X-Title": "jagx-cli" }
        : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Image API ${res.status}: ${t.slice(0, 400)}`);
  }

  const data = await res.json();
  const item = data.data?.[0];
  const outDir = path.join(workdir, "assets");
  fs.mkdirSync(outDir, { recursive: true });
  const safeName = (filename || `image-${Date.now()}`).replace(/[^\w.-]+/g, "_");
  const outPath = path.join(outDir, safeName.endsWith(".png") ? safeName : `${safeName}.png`);

  if (item?.b64_json) {
    fs.writeFileSync(outPath, Buffer.from(item.b64_json, "base64"));
  } else if (item?.url) {
    const imgRes = await fetch(item.url);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(outPath, buf);
  } else {
    throw new Error("Image API returned no url or b64_json");
  }

  return { path: path.relative(workdir, outPath), absolute: outPath, model };
}
