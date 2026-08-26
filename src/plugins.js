import { loadConfig, saveConfig } from "./config.js";

export function listPlugins() {
  return loadConfig().plugins || {};
}

export function setPlugin(name, data) {
  const current = loadConfig();
  const plugins = current.plugins || {};
  plugins[name] = data;
  saveConfig({ plugins });
}

export function removePlugin(name) {
  const current = loadConfig();
  const plugins = current.plugins || {};
  delete plugins[name];
  saveConfig({ plugins });
}

export async function sendEmailViaResend({ apiKey, from, to, subject, text }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}
