/** Honest gaps vs Cursor / Codex / cloud agents — `jagx roadmap` */
export const ROADMAP = [
  {
    gap: "IDE overlay",
    why: "Cursor wins inline diffs in the editor. JagX is terminal-native. Next: VS Code/Cursor extension that hosts the same group.",
  },
  {
    gap: "Repo embeddings",
    why: "Large monorepos need indexed search, not just glob/grep. Next: optional local index.",
  },
  {
    gap: "Hour-long autonomous runs",
    why: "Cloud agents keep a VM overnight. JagX is a local process. Next: jagx daemon + checkpoints.",
  },
  {
    gap: "Computer-use browser",
    why: "Playwright is optional and shallow. Next: scripted click/type when the user installs the browser extra.",
  },
  {
    gap: "Eval harness",
    why: "Beating others is a score, not a slogan. Next: SWE-bench-style local tasks in npm run bench:swe.",
  },
  {
    gap: "Native tools + token stream together",
    why: "Streaming today is text-JSON. Frontier APIs can stream tool calls; wire that without dropping recovery.",
  },
  {
    gap: "GitHub PR agent",
    why: "Open/update PRs from the group with a user token — coding-first, not social-first.",
  },
];

export function printRoadmap() {
  const CYAN = "\x1b[36m";
  const DIM = "\x1b[2m";
  const YELLOW = "\x1b[33m";
  const RESET = "\x1b[0m";
  console.log(`${CYAN}What still separates JagX from Cursor/Codex-class agents${RESET}\n`);
  console.log(`${DIM}Coding is the main job. Social/email/X only run when you plug keys and direct them.${RESET}\n`);
  ROADMAP.forEach((r, i) => {
    console.log(`${YELLOW}${i + 1}. ${r.gap}${RESET}`);
    console.log(`   ${r.why}\n`);
  });
}
