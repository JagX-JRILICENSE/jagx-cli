import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyUnifiedPatch } from "../src/patch.js";

describe("applyUnifiedPatch", () => {
  it("applies a simple hunk", () => {
    const original = "line1\nline2\nline3\n";
    const patch = `--- a/f
+++ b/f
@@ -1,3 +1,3 @@
 line1
-line2
+line2-changed
 line3
`;
    const next = applyUnifiedPatch(original, patch);
    assert.equal(next, "line1\nline2-changed\nline3\n");
  });

  it("inserts a line", () => {
    const original = "a\nb\n";
    const patch = `@@ -1,2 +1,3 @@
 a
+mid
 b
`;
    const next = applyUnifiedPatch(original, patch);
    assert.equal(next, "a\nmid\nb\n");
  });

  it("deletes a line", () => {
    const original = "a\nb\nc\n";
    const patch = `@@ -1,3 +1,2 @@
 a
-b
 c
`;
    const next = applyUnifiedPatch(original, patch);
    assert.equal(next, "a\nc\n");
  });
});
