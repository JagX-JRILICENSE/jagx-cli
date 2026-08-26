import fs from "node:fs";
import path from "node:path";

const AGENTS_MD = `# Project instructions for JagX AI coding agent

## Stack
- (fill in: language, framework, package manager)

## Conventions
- Prefer small, focused changes
- Match existing style; do not reformat unrelated code
- Write tests when adding non-trivial logic

## Commands
- Install: 
- Test: 
- Lint: 
- Dev: 

## Do not
- Commit secrets
- Run destructive shell commands
- Refactor outside the requested task without asking
`;

const CONFIG = {
  maxSteps: 40,
  approval: "full-auto",
  handsOff: true,
  testCommand: null,
};

export function initProject(workdir, { force = false } = {}) {
  const created = [];
  const skipped = [];

  const agentsPath = path.join(workdir, "AGENTS.md");
  if (fs.existsSync(agentsPath) && !force) {
    skipped.push("AGENTS.md (already exists)");
  } else {
    fs.writeFileSync(agentsPath, AGENTS_MD, "utf8");
    created.push("AGENTS.md");
  }

  const cfgPath = path.join(workdir, "jagx.config.json");
  if (fs.existsSync(cfgPath) && !force) {
    skipped.push("jagx.config.json (already exists)");
  } else {
    // detect test command
    let testCommand = null;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(workdir, "package.json"), "utf8"));
      if (pkg.scripts?.test) testCommand = "npm test";
    } catch {
      /* ignore */
    }
    const cfg = { ...CONFIG, testCommand };
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
    created.push("jagx.config.json");
  }

  const gitignorePath = path.join(workdir, ".gitignore");
  const jagxIgnore = "\n# JagX agent\n.jagx/\n";
  if (fs.existsSync(gitignorePath)) {
    const cur = fs.readFileSync(gitignorePath, "utf8");
    if (!cur.includes(".jagx")) {
      fs.appendFileSync(gitignorePath, jagxIgnore);
      created.push(".gitignore (+ .jagx/)");
    } else {
      skipped.push(".gitignore (already ignores .jagx)");
    }
  } else {
    fs.writeFileSync(gitignorePath, `# JagX agent\n.jagx/\nnode_modules/\n`, "utf8");
    created.push(".gitignore");
  }

  return { created, skipped };
}
