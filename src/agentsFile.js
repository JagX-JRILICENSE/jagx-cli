import fs from "node:fs";
import path from "node:path";

const CANDIDATES = ["AGENTS.md", "JAGX.md"];
const MAX_LEN = 4000;

export function loadAgentsFile(workdir) {
  for (const name of CANDIDATES) {
    try {
      const content = fs.readFileSync(path.join(workdir, name), "utf8");
      return { file: name, content: content.slice(0, MAX_LEN) };
    } catch {
      // try next
    }
  }
  return null;
}
