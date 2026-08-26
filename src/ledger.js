import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/** Rough USD per 1M tokens — estimates for display only */
const PRICE_PER_MTOk = {
  "claude-sonnet": { in: 3, out: 15 },
  "claude-opus": { in: 15, out: 75 },
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "llama-3.3-70b": { in: 0, out: 0 },
  default: { in: 0.5, out: 1.5 },
};

function priceForModel(model = "") {
  const m = model.toLowerCase();
  if (m.includes("opus")) return PRICE_PER_MTOk["claude-opus"];
  if (m.includes("sonnet") || m.includes("claude")) return PRICE_PER_MTOk["claude-sonnet"];
  if (m.includes("gpt-4o-mini")) return PRICE_PER_MTOk["gpt-4o-mini"];
  if (m.includes("gpt-4o")) return PRICE_PER_MTOk["gpt-4o"];
  if (m.includes("llama") || m.includes(":free")) return PRICE_PER_MTOk["llama-3.3-70b"];
  return PRICE_PER_MTOk.default;
}

function globalLedgerPath() {
  return path.join(os.homedir(), ".jagx", "ledger.json");
}

function sessionLedgerPath(workdir) {
  return path.join(workdir, ".jagx", "ledger-session.json");
}

function load(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { calls: 0, inputTokens: 0, outputTokens: 0, estUsd: 0, entries: [] };
  }
}

function save(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function recordUsage({ workdir, provider, model, usage }) {
  if (!usage) return null;
  const input = usage.inputTokens || 0;
  const output = usage.outputTokens || 0;
  const price = priceForModel(model);
  const est = (input * price.in + output * price.out) / 1_000_000;

  const entry = {
    t: new Date().toISOString(),
    provider,
    model: model || "",
    input,
    output,
    estUsd: Number(est.toFixed(6)),
  };

  for (const file of [globalLedgerPath(), workdir ? sessionLedgerPath(workdir) : null].filter(Boolean)) {
    const data = load(file);
    data.calls += 1;
    data.inputTokens += input;
    data.outputTokens += output;
    data.estUsd = Number((data.estUsd + est).toFixed(6));
    data.entries = [...(data.entries || []).slice(-199), entry];
    save(file, data);
  }
  return entry;
}

export function getLedgerSummary(workdir) {
  const global = load(globalLedgerPath());
  const session = workdir ? load(sessionLedgerPath(workdir)) : null;
  return { global, session };
}

export function printLedger(workdir) {
  const { global, session } = getLedgerSummary(workdir);
  const DIM = "\x1b[2m";
  const CYAN = "\x1b[36m";
  const RESET = "\x1b[0m";
  console.log(`${CYAN}Usage ledger${RESET} (estimates only)\n`);
  console.log(`Global (~/.jagx/ledger.json)`);
  console.log(`  calls: ${global.calls}  tokens in/out: ${global.inputTokens}/${global.outputTokens}  est USD: $${global.estUsd}`);
  if (session) {
    console.log(`\nThis project`);
    console.log(`  calls: ${session.calls}  tokens in/out: ${session.inputTokens}/${session.outputTokens}  est USD: $${session.estUsd}`);
  }
  console.log(`\n${DIM}Free-tier models often show $0. Prices are approximate.${RESET}`);
}
