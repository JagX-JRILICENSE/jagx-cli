import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { writeBlueprint, runIntegration } from "../src/integrations.js";
import { FEATURES } from "../src/features.js";
import { ROADMAP } from "../src/roadmap.js";
import { TEAM_ROLES } from "../src/team.js";

describe("integrations", () => {
  it("writes architecture blueprint", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-bp-"));
    const rel = writeBlueprint(dir, { title: "Pay", content: "API + wallet", mermaid: "flowchart LR\n  a-->b" });
    const text = fs.readFileSync(path.join(dir, rel), "utf8");
    assert.match(text, /Pay/);
    assert.match(text, /mermaid/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("refuses email without plugin", async () => {
    await assert.rejects(() => runIntegration("send_email", { to: "a@b.c", subject: "x" }, os.tmpdir()), /Resend/);
  });
});

describe("catalog", () => {
  it("has 100 features", () => {
    assert.equal(FEATURES.length, 100);
  });
  it("has a roadmap", () => {
    assert.ok(ROADMAP.length >= 5);
  });
  it("has architect role", () => {
    assert.ok(TEAM_ROLES.architect);
  });
});
