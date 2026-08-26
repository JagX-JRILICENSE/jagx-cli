import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ensureExampleSkill, listSkills, skillsContextBlock } from "../src/skills.js";

describe("skills", () => {
  let dir;
  before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-sk-")); });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));
  it("creates and loads example skill", () => {
    ensureExampleSkill(dir);
    const list = listSkills(dir);
    assert.ok(list.some((s) => s.id === "testing"));
    assert.match(skillsContextBlock(dir), /Testing skill/);
  });
});
