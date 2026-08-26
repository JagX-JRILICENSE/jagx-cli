import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "../src/init.js";

describe("initProject", () => {
  let dir;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-init-"));
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("creates AGENTS.md and jagx.config.json", () => {
    const { created } = initProject(dir);
    assert.ok(created.includes("AGENTS.md"));
    assert.ok(created.includes("jagx.config.json"));
    assert.ok(fs.existsSync(path.join(dir, "AGENTS.md")));
    const cfg = JSON.parse(fs.readFileSync(path.join(dir, "jagx.config.json"), "utf8"));
    assert.equal(cfg.approval, "full-auto");
    assert.equal(cfg.handsOff, true);
  });

  it("skips without --force", () => {
    const { skipped } = initProject(dir);
    assert.ok(skipped.some((s) => s.includes("AGENTS.md")));
  });
});
