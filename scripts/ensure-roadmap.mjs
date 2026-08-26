import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "src", "roadmap.js");
if (!fs.existsSync(target)) {
  fs.writeFileSync(target, `/** Honest gaps vs Cursor / Codex — \`jagx roadmap\` */
export const ROADMAP = [
  { gap: "IDE overlay", why: "Terminal-native; next: editor extension." },
  { gap: "Repo embeddings", why: "Large monorepos need indexed search." },
  { gap: "Long daemon runs", why: "Next: jagx daemon + checkpoints." },
  { gap: "Computer-use browser", why: "Optional Playwright click/type." },
  { gap: "Eval harness", why: "SWE-bench-style local tasks." },
  { gap: "Stream + native tools", why: "Stream tool calls without dropping recovery." },
  { gap: "GitHub PR agent", why: "Open/update PRs with user token." },
];
export function printRoadmap() {
  console.log("jagx roadmap\\n");
  ROADMAP.forEach((r, i) => console.log(i + 1 + ". " + r.gap + " — " + r.why));
}
`);
  console.log("created", target);
} else {
  console.log("ok", target);
}
