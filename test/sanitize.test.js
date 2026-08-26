import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeText, sanitizeAction } from "../src/sanitize.js";

describe("sanitizeText", () => {
  it("strips zero-width spaces and BOM", () => {
    const dirty = "Hel\u200Blo\uFEFF world\u200D";
    assert.equal(sanitizeText(dirty), "Hello world");
  });

  it("strips bidi overrides", () => {
    const dirty = "ab\u202Ecd";
    assert.equal(sanitizeText(dirty), "abcd");
  });

  it("leaves normal code alone", () => {
    const code = 'const add = (a, b) => a + b;\n';
    assert.equal(sanitizeText(code), code);
  });

  it("handles null/undefined", () => {
    assert.equal(sanitizeText(null), "");
    assert.equal(sanitizeText(undefined), "");
  });
});

describe("sanitizeAction", () => {
  it("sanitizes write_file content", () => {
    const action = {
      tool: "write_file",
      input: { path: "a.js", content: "x\u200By" },
    };
    const clean = sanitizeAction(action);
    assert.equal(clean.input.content, "xy");
    assert.equal(clean.input.path, "a.js");
  });

  it("sanitizes plan steps", () => {
    const action = { plan: ["step\u200B one", "step two"] };
    assert.deepEqual(sanitizeAction(action).plan, ["step one", "step two"]);
  });
});
