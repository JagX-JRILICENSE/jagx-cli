#!/usr/bin/env node
/**
 * Local harness (no API keys) — validates agent infrastructure quality:
 * path sandbox, patch apply, secret scan, JSON extract, sanitize.
 * Run: node scripts/bench-local.mjs
 */
import { performance } from "node:perf_hooks";
import { extractJson, isToolAction } from "../src/jsonUtil.js";
import { sanitizeText } from "../src/sanitize.js";
import { applyUnifiedPatch } from "../src/patch.js";
import { isDangerous } from "../src/tools.js";
import { scanForSecrets } from "../src/audit.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const cases = [];
function check(name, fn) {
  const t0 = performance.now();
  try {
    fn();
    cases.push({ name, ok: true, ms: performance.now() - t0 });
  } catch (e) {
    cases.push({ name, ok: false, ms: performance.now() - t0, err: e.message });
  }
}

check("extractJson fence", () => {
  const j = extractJson('```json\n{"tool":"read_file","input":{"path":"x"}}\n```');
  if (!isToolAction(j)) throw new Error("not tool");
});

check("sanitize watermarks", () => {
  if (sanitizeText("a\u200Bb") !== "ab") throw new Error("bad sanitize");
});

check("patch apply", () => {
  const n = applyUnifiedPatch("a\nb\n", "@@ -1,2 +1,2 @@\n a\n-b\n+c\n");
  if (!n.includes("c")) throw new Error(n);
});

check("danger blocklist", () => {
  if (!isDangerous("rm -rf /") || isDangerous("npm test")) throw new Error("danger");
});

check("secret scan", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-b-"));
  fs.writeFileSync(path.join(dir, "x.js"), 'const k = "sk-ant-api03-abcdefghijklmnopqrstuv";');
  const f = scanForSecrets(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  if (!f.length) throw new Error("missed secret");
});

const passed = cases.filter((c) => c.ok).length;
console.log("jagx local bench");
for (const c of cases) {
  console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.name}  (${c.ms.toFixed(1)}ms)${c.err ? " — " + c.err : ""}`);
}
console.log(`${passed}/${cases.length} passed`);
process.exit(passed === cases.length ? 0 : 1);
