import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scanForSecrets, checkDependencies } from "../src/audit.js";

describe("scanForSecrets", () => {
  let dir;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-audit-"));
    fs.writeFileSync(
      path.join(dir, "leak.js"),
      'const key = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz";\n',
    );
    fs.writeFileSync(path.join(dir, "clean.js"), "const x = 1;\n");
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("finds Anthropic-style keys", () => {
    const findings = scanForSecrets(dir);
    assert.ok(findings.some((f) => f.file === "leak.js"));
    const leak = findings.find((f) => f.file === "leak.js");
    assert.ok(leak.findings.length >= 1);
    assert.ok(["high", "medium"].includes(leak.severity));
  });

  it("ignores clean files", () => {
    const findings = scanForSecrets(dir);
    assert.ok(!findings.some((f) => f.file === "clean.js"));
  });
});

describe("checkDependencies", () => {
  it("notes missing package.json", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-dep-"));
    try {
      const r = checkDependencies(dir);
      assert.equal(r.vulnerabilities, null);
      assert.match(r.note, /No package.json/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("notes missing lockfile", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-dep-"));
    try {
      fs.writeFileSync(path.join(dir, "package.json"), '{"name":"t"}');
      const r = checkDependencies(dir);
      assert.equal(r.vulnerabilities, null);
      assert.match(r.note, /lockfile/i);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
