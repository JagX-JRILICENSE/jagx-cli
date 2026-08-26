import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { detectTestCommand } from "../src/projectConfig.js";

describe("detectTestCommand", () => {
  let dir;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-pc-"));
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("detects npm test", () => {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ scripts: { test: "node --test" } }),
    );
    assert.equal(detectTestCommand(dir), "npm test");
  });

  it("detects go test", () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-go-"));
    try {
      fs.writeFileSync(path.join(d, "go.mod"), "module example\n");
      assert.equal(detectTestCommand(d), "go test ./...");
    } finally {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it("detects pytest", () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-py-"));
    try {
      fs.writeFileSync(path.join(d, "pytest.ini"), "[pytest]\n");
      assert.equal(detectTestCommand(d), "pytest -q");
    } finally {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });
});
