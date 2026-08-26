import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { recordUsage, getLedgerSummary } from "../src/ledger.js";

describe("ledger", () => {
  it("records usage", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-led-"));
    recordUsage({ workdir: dir, provider: "groq", model: "llama-3.3-70b-versatile", usage: { inputTokens: 100, outputTokens: 50 } });
    const { session } = getLedgerSummary(dir);
    assert.equal(session.calls, 1);
    assert.equal(session.inputTokens, 100);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
