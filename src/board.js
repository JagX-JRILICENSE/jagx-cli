import fs from "node:fs";
import path from "node:path";

function boardPath(workdir) {
  return path.join(workdir, ".jagx", "groups", "board.json");
}

export function saveBoard(workdir, board) {
  const file = boardPath(workdir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(board, null, 2));
  return file;
}

export function loadBoard(workdir) {
  try {
    return JSON.parse(fs.readFileSync(boardPath(workdir), "utf8"));
  } catch {
    return null;
  }
}

export function listGroupLogs(workdir) {
  const dir = path.join(workdir, ".jagx", "groups");
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const full = path.join(dir, f);
        return { file: full, name: f, mtime: fs.statSync(full).mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

export function printBoard(board) {
  if (!board) {
    console.log("No group board yet. Run: jagx group \"your task\"");
    return;
  }
  const DIM = "\x1b[2m";
  const CYAN = "\x1b[36m";
  const GREEN = "\x1b[32m";
  const YELLOW = "\x1b[33m";
  const RESET = "\x1b[0m";
  console.log(`${CYAN}Group board${RESET}  ${DIM}${board.groupName}${RESET}`);
  console.log(`${DIM}${board.task}${RESET}\n`);
  for (const a of board.assignments || []) {
    const st =
      a.status === "done" ? `${GREEN}done${RESET}` : a.status === "rework" ? `${YELLOW}rework${RESET}` : a.status || "todo";
    console.log(`  ${a.id || "?"}  [${a.role}] ${st}  ${a.task}`);
  }
}
