import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  isDangerous,
  readFileTool,
  writeFileTool,
  listDirTool,
  runShellTool,
} from "../src/tools.js";

describe("isDangerous", () => {
  it("blocks catastrophic patterns", () => {
    assert.equal(isDangerous("rm -rf /"), true);
    assert.equal(isDangerous("sudo apt install x"), true);
    assert.equal(isDangerous("mkfs.ext4 /dev/sda"), true);
  });

  it("allows normal commands", () => {
    assert.equal(isDangerous("npm test"), false);
    assert.equal(isDangerous("ls -la"), false);
    assert.equal(isDangerous("rm -rf ./dist"), false);
  });
});

describe("path sandbox", () => {
  let dir;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "jagx-test-"));
    fs.writeFileSync(path.join(dir, "hello.txt"), "hi");
  });
  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("reads and writes inside workdir", () => {
    assert.equal(readFileTool(dir, "hello.txt"), "hi");
    writeFileTool(dir, "out.txt", "ok");
    assert.equal(fs.readFileSync(path.join(dir, "out.txt"), "utf8"), "ok");
  });

  it("refuses path escape", () => {
    assert.throws(() => readFileTool(dir, "../outside"), /outside the project/);
  });

  it("lists dir without node_modules", () => {
    fs.mkdirSync(path.join(dir, "node_modules"));
    const listing = listDirTool(dir, ".");
    assert.ok(listing.includes("hello.txt"));
    assert.ok(!listing.includes("node_modules"));
  });

  it("runs shell in workdir", () => {
    const out = runShellTool(dir, "echo hello-from-shell");
    assert.match(out, /hello-from-shell/);
  });
});
