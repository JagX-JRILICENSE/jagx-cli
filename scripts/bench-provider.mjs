#!/usr/bin/env node
/**
 * Timed provider benchmark (requires a configured provider key).
 * Usage:
 *   jagx config --provider groq --key gsk_...
 *   node scripts/bench-provider.mjs
 *
 * Measures latency for a tiny chat + a tiny plan JSON response.
 */
import { performance } from "node:perf_hooks";
import { sendMessage } from "../src/api.js";
import { getProvider, usingDemoKey } from "../src/config.js";
import { extractJson } from "../src/jsonUtil.js";

const provider = getProvider();
console.log(`jagx provider bench — provider=${provider}`);

if (provider === "jagx" && usingDemoKey()) {
  console.log("Using demo JagX key (may be slow/cold). Prefer nvidia/openrouter/groq free keys.");
}

const cases = [
  {
    name: "chat_hello",
    run: async () => {
      const { response } = await sendMessage("Reply with exactly: pong", [], "core");
      if (!/pong/i.test(response)) throw new Error(`unexpected: ${response.slice(0, 80)}`);
    },
  },
  {
    name: "plan_json",
    run: async () => {
      const { response } = await sendMessage(
        'Reply with ONLY JSON: {"plan":["a","b","c"]}',
        [],
        "engineer",
      );
      const j = extractJson(response);
      if (!j?.plan?.length) throw new Error(`no plan in: ${response.slice(0, 120)}`);
    },
  },
  {
    name: "tool_shape",
    run: async () => {
      const { response } = await sendMessage(
        'Reply with ONLY: {"tool":"list_dir","input":{"path":"."}}',
        [],
        "engineer",
      );
      const j = extractJson(response);
      if (j?.tool !== "list_dir") throw new Error(`bad tool shape: ${response.slice(0, 120)}`);
    },
  },
];

let pass = 0;
for (const c of cases) {
  const t0 = performance.now();
  try {
    await c.run();
    const ms = performance.now() - t0;
    console.log(`  PASS  ${c.name}  ${ms.toFixed(0)}ms`);
    pass++;
  } catch (e) {
    const ms = performance.now() - t0;
    console.log(`  FAIL  ${c.name}  ${ms.toFixed(0)}ms  — ${e.message}`);
  }
}
console.log(`${pass}/${cases.length} passed`);
process.exit(pass === cases.length ? 0 : 1);
