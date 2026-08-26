import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * Skills packs — markdown playbooks injected into agent context.
 * Search order: project .jagx/skills/ → project skills/ → ~/.jagx/skills/
 */

function readSkillDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  for (const name of entries) {
    if (!name.endsWith(".md")) continue;
    try {
      const content = fs.readFileSync(path.join(dir, name), "utf8");
      out.push({
        id: name.replace(/\.md$/, ""),
        path: path.join(dir, name),
        content: content.slice(0, 8000),
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

export function discoverSkills(workdir) {
  const dirs = [
    path.join(workdir, ".jagx", "skills"),
    path.join(workdir, "skills"),
    path.join(os.homedir(), ".jagx", "skills"),
  ];
  const byId = new Map();
  for (const d of dirs) {
    for (const s of readSkillDir(d)) {
      if (!byId.has(s.id)) byId.set(s.id, s);
    }
  }
  return [...byId.values()];
}

export function skillsContextBlock(workdir, filterIds = null) {
  let skills = discoverSkills(workdir);
  if (filterIds?.length) {
    const set = new Set(filterIds);
    skills = skills.filter((s) => set.has(s.id));
  }
  if (!skills.length) return "";
  const parts = skills.map((s) => `### Skill: ${s.id}\n${s.content}`);
  return `\n\nLoaded skills:\n${parts.join("\n\n")}`;
}

export function ensureExampleSkill(workdir) {
  const dir = path.join(workdir, ".jagx", "skills");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "testing.md");
  if (fs.existsSync(file)) return file;
  fs.writeFileSync(
    file,
    `# Testing skill

When adding features:
1. Prefer project test command from package.json / jagx.config.json
2. After writes, run tests if available
3. Fix failures before finishing
4. Do not skip failing tests silently
`,
    "utf8",
  );
  return file;
}

export function listSkills(workdir) {
  return discoverSkills(workdir).map((s) => ({ id: s.id, path: s.path }));
}
