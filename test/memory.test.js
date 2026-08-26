import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { addFact, loadFacts, appendProjectMemory, memoryContextBlock, clearMemory } from "../src/memory.js";

describe("memory", () => {
  let dir;
  before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-mem-")); });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("stores facts and context", () => {
    addFact(dir, "uses TypeScript");
    addFact(dir, "uses TypeScript"); // dedupe
    assert.equal(loadFacts(dir).length, 1);
    appendProjectMemory(dir, "Built auth module");
    const block = memoryContextBlock(dir);
    assert.match(block, /TypeScript/);
    assert.match(block, /auth/);
    assert.equal(clearMemory(dir), true);
  });
});
