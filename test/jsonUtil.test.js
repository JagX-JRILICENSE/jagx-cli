import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractJson, isToolAction } from "../src/jsonUtil.js";

describe("extractJson", () => {
  it("parses plain JSON", () => {
    assert.deepEqual(extractJson('{"tool":"read_file","input":{"path":"x.js"}}'), {
      tool: "read_file",
      input: { path: "x.js" },
    });
  });

  it("parses fenced JSON", () => {
    const text = 'Here you go:\n```json\n{"final":"done"}\n```\n';
    assert.deepEqual(extractJson(text), { final: "done" });
  });

  it("extracts first balanced object from prose", () => {
    const text = 'Sure. {"tool":"list_dir","input":{"path":"."}} hope that helps';
    assert.deepEqual(extractJson(text), { tool: "list_dir", input: { path: "." } });
  });

  it("handles nested braces in string values", () => {
    const text = '{"tool":"write_file","input":{"path":"a.js","content":"const o = {a:1};"}}';
    const j = extractJson(text);
    assert.equal(j.tool, "write_file");
    assert.equal(j.input.content, "const o = {a:1};");
  });

  it("returns null for non-JSON", () => {
    assert.equal(extractJson("Hello, I am JagX AI"), null);
  });
});

describe("isToolAction", () => {
  it("accepts tool, final, plan", () => {
    assert.equal(isToolAction({ tool: "x" }), true);
    assert.equal(isToolAction({ final: "done" }), true);
    assert.equal(isToolAction({ plan: ["a"] }), true);
    assert.equal(isToolAction({ foo: 1 }), false);
  });
});
