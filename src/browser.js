/**
 * Optional headless browser preview.
 * Uses Playwright if installed in the project or globally; otherwise falls back to fetch-based preview.
 *
 * Install (optional):
 *   npm i -D playwright
 *   npx playwright install chromium
 */
import { previewUrl, formatPreview } from "./preview.js";
import path from "node:path";
import fs from "node:fs";

async function tryLoadPlaywright() {
  try {
    const mod = await import("playwright");
    return mod.chromium || mod.default?.chromium;
  } catch {
    return null;
  }
}

export async function browserPreview(url, { screenshotPath = null, workdir = process.cwd() } = {}) {
  const chromium = await tryLoadPlaywright();
  if (!chromium) {
    const basic = await previewUrl(url);
    return {
      mode: "fetch",
      ...basic,
      note: "Playwright not installed — used HTTP preview. Optional: npm i -D playwright && npx playwright install chromium",
      formatted: formatPreview(basic),
    };
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const status = response?.status() ?? 0;
    const title = await page.title();
    const text = await page.evaluator(() => document.body?.innerText?.slice(0, 2000) || "");
    let shot = null;
    if (screenshotPath || workdir) {
      const out = screenshotPath
        ? path.resolve(workdir, screenshotPath)
        : path.join(workdir, ".jagx", "preview.png");
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await page.screenshot({ path: out, fullPage: false });
      shot = path.relative(workdir, out);
    }
    const findings = [];
    if (status >= 400) findings.push(`HTTP ${status}`);
    if (/error|exception|cannot get/i.test(text) && status >= 400) findings.push("Page text looks like an error");

    return {
      mode: "playwright",
      status,
      title,
      findings,
      snippet: text.slice(0, 800),
      screenshot: shot,
      formatted: [
        `mode: playwright`,
        `status: ${status}`,
        `title: ${title || "(none)"}`,
        findings.length ? `findings: ${findings.join("; ")}` : null,
        shot ? `screenshot: ${shot}` : null,
        `snippet:\n${text.slice(0, 500)}`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  } finally {
    await browser.close();
  }
}

export function browserAvailableSync() {
  // Best-effort: cannot require ESM sync easily; CLI doctor checks async.
  return false;
}
