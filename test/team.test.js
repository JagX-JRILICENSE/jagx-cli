import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TEAM_ROLES } from "../src/team.js";

describe("TEAM_ROLES", () => {
  it("has specialist roster", () => {
    for (const r of ["lead", "scaffold", "files", "backend", "frontend", "shell", "design", "review", "image", "architect"]) {
      assert.ok(TEAM_ROLES[r], r);
      assert.ok(TEAM_ROLES[r].system.length > 20);
    }
  });
});
