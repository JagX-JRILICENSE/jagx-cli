import fs from "node:fs";
import path from "node:path";

function backupDir(workdir) {
  return path.join(workdir, ".jagx", "backups");
}
function logPath(workdir) {
  return path.join(backupDir(workdir), "log.json");
}
function loadLog(workdir) {
  try {
    return JSON.parse(fs.readFileSync(logPath(workdir), "utf8"));
  } catch {
    return [];
  }
}
function saveLog(workdir, log) {
  fs.mkdirSync(backupDir(workdir), { recursive: true });
  fs.writeFileSync(logPath(workdir), JSON.stringify(log, null, 2));
}

export function backupBeforeWrite(workdir, relPath, existedBefore, previousContent) {
  const log = loadLog(workdir);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let backupFile = null;
  if (existedBefore) {
    fs.mkdirSync(backupDir(workdir), { recursive: true });
    backupFile = path.join(backupDir(workdir), `${id}.txt`);
    fs.writeFileSync(backupFile, previousContent, "utf8");
  }
  log.push({ id, path: relPath, existedBefore, backupFile, time: new Date().toISOString() });
  saveLog(workdir, log);
}

export function listBackups(workdir) {
  return loadLog(workdir);
}

export function undoLastWrite(workdir) {
  const log = loadLog(workdir);
  if (log.length === 0) {
    return { ok: false, message: "Nothing to undo — no tracked writes in this folder." };
  }
  const last = log.pop();
  const target = path.join(workdir, last.path);
  try {
    if (last.existedBefore) {
      const content = fs.readFileSync(last.backupFile, "utf8");
      fs.writeFileSync(target, content, "utf8");
    } else {
      fs.rmSync(target, { force: true });
    }
  } catch (e) {
    return { ok: false, message: `Undo failed: ${e.message}` };
  }
  saveLog(workdir, log);
  return {
    ok: true,
    message: last.existedBefore
      ? `Restored ${last.path} to its previous content.`
      : `Removed ${last.path} (jagx had created it new).`,
  };
}
