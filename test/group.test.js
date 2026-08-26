import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TEAM_ROLES } from "../src/team.js";
import { ensureScaffoldFirst, DEFAULT_MEMBERS } from "../src/group.js";
import { FEATURES } from "../src/features.js";
import { mkdirTool, globTool, moveFileTool, deleteFileTool, createWriteLock } from "../src/tools.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("group module", () => {
  it("exports runGroupSession and runGroupChat", async () => {
    const g = await import("../src/group.js");
    assert.equal(typeof g.runGroupSession, "function");
    assert.equal(typeof g.runGroupChat, "function");
  });
  it("team roles cover group roster", () => {
    for (const r of ["lead", "scaffold", "backend", "frontend", "files", "shell", "design", "review", "image"]) {
      assert.ok(TEAM_ROLES[r], r);
    }
  });
  it("default members include scaffold and review", () => {
    assert.ok(DEFAULT_MEMBERS.includes("scaffold"));
    assert.ok(DEFAULT_MEMBERS.includes("review"));
  });
  it("ensureScaffoldFirst prepends scaffold and wires deps", () => {
    const out = ensureScaffoldFirst([{ role: "backend", task: "api", dependsOn: [] }]);
    assert.equal(out[0].role, "scaffold");
    const be = out.find((a) => a.role === "backend");
    assert.ok(be.dependsOn.includes(out[0].id));
  });
});

describe("features catalog", () => {
  it("has 100 features", () => {
    assert.equal(FEATURES.length, 100);
  });
});

describe("file tools", () => {
  it("mkdir glob move delete inside workdir", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-ft-"));
    mkdirTool(dir, "src/api");
    fs.writeFileSync(path.join(dir, "src/api/a.js"), "1");
    assert.match(globTool(dir, "**/*.js"), /a\.js/);
    moveFileTool(dir, "src/api/a.js", "src/api/b.js");
    assert.equal(fs.existsSync(path.join(dir, "src/api/b.js")), true);
    deleteFileTool(dir, "src/api/b.js");
    assert.equal(fs.existsSync(path.join(dir, "src/api/b.js")), false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("write lock serializes", async () => {
    const lock = createWriteLock();
    const order = [];
    await Promise.all([
      lock.run("a", async () => {
        order.push("1s");
        await new Promise((r) => setTimeout(r, 20));
        order.push("1e");
      }),
      lock.run("a", async () => {
        order.push("2s");
        order.push("2e");
      }),
    ]);
    assert.deepEqual(order, ["1s", "1e", "2s", "2e"]);
  });
});
