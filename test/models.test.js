import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MODEL_CATALOG, recommendAfterConnect } from "../src/models.js";

describe("MODEL_CATALOG", () => {
  it("has free-oriented providers", () => {
    for (const p of ["nvidia", "openrouter", "groq"]) {
      assert.ok(MODEL_CATALOG[p]);
      assert.ok(MODEL_CATALOG[p].recommended.length >= 2);
    }
  });
  it("recommends after connect", () => {
    const r = recommendAfterConnect("groq");
    assert.ok(r.id);
    assert.ok(r.bestFor);
  });
});
