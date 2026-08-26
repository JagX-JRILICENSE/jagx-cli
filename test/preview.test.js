import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatPreview } from "../src/preview.js";

describe("formatPreview", () => {
  it("formats result", () => {
    const s = formatPreview({ status: 200, title: "Hi", findings: [], snippet: "abc", headers: { "content-type": "text/html" } });
    assert.match(s, /status: 200/);
    assert.match(s, /Hi/);
  });
});
