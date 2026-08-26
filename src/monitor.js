import { fetchUrlTool } from "./netTools.js";

const GREEN = "\x1b[32m", RED = "\x1b[31m", CYAN = "\x1b[36m", RESET = "\x1b[0m";

export async function monitorUrl(url, intervalSeconds) {
  console.log(`${CYAN}Monitoring ${url} every ${intervalSeconds}s — Ctrl+C to stop.${RESET}\n`);
  let lastStatus = null;
  for (;;) {
    const start = Date.now();
    try {
      const res = await fetchUrlTool(url);
      const ms = Date.now() - start;
      const ok = res.status >= 200 && res.status < 400;
      const changed = lastStatus !== null && lastStatus !== res.status;
      console.log(`${ok ? GREEN : RED}[${new Date().toLocaleTimeString()}] ${res.status} — ${ms}ms${changed ? " (status changed!)" : ""}${RESET}`);
      lastStatus = res.status;
    } catch (e) {
      console.log(`${RED}[${new Date().toLocaleTimeString()}] DOWN — ${e.message}${RESET}`);
      lastStatus = "down";
    }
    await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
  }
}
