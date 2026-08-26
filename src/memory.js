import fs from "node:fs";
import path from "node:path";

function memoryDir(workdir) {
  return path.join(workdir, ".jagx", "memory");
}
function memoryFile(workdir) {
  return path.join(memoryDir(workdir), "project.md");
}
function factsFile(workdir) {
  return path.join(memoryDir(workdir), "facts.json");
}

export function loadProjectMemory(workdir) {
  try {
    return fs.readFileSync(memoryFile(workdir), "utf8");
  } catch {
    return "";
  }
}

export function appendProjectMemory(workdir, note) {
  fs.mkdirSync(memoryDir(workdir), { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace("T", " ");
  const line = `\n### ${stamp}\n${note.trim()}\n`;
  fs.appendFileSync(memoryFile(workdir), line, "utf8");
}

export function loadFacts(workdir) {
  try {
    return JSON.parse(fs.readFileSync(factsFile(workdir), "utf8"));
  } catch {
    return [];
  }
}

export function addFact(workdir, fact) {
  const facts = loadFacts(workdir);
  const text = String(fact).trim();
  if (!text) return;
  if (facts.includes(text)) return;
  facts.push(text);
  // keep last 40 facts
  const trimmed = facts.slice(-40);
  fs.mkdirSync(memoryDir(workdir), { recursive: true });
  fs.writeFileSync(factsFile(workdir), JSON.stringify(trimmed, null, 2));
}

export function memoryContextBlock(workdir) {
  const facts = loadFacts(workdir);
  const mem = loadProjectMemory(workdir);
  let block = "";
  if (facts.length) {
    block += `\n\nProject facts (durable memory):\n${facts.map((f) => `- ${f}`).join("\n")}`;
  }
  if (mem.trim()) {
    // last ~2000 chars only
    const slice = mem.trim().slice(-2000);
    block += `\n\nRecent project memory:\n${slice}`;
  }
  return block;
}

export function clearMemory(workdir) {
  try {
    fs.rmSync(memoryDir(workdir), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}
