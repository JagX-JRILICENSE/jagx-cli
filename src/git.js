import { execFileSync } from "node:child_process";

function run(workdir, args) {
  try {
    return execFileSync("git", args, { cwd: workdir, encoding: "utf8", timeout: 15000 });
  } catch (err) {
    return null;
  }
}

export function isGitRepo(workdir) {
  return run(workdir, ["rev-parse", "--is-inside-work-tree"])?.trim() === "true";
}

export function gitContext(workdir) {
  if (!isGitRepo(workdir)) return null;
  const status = run(workdir, ["status", "--short"]) || "";
  const branch = (run(workdir, ["branch", "--show-current"]) || "").trim();
  const diffStat = run(workdir, ["diff", "--stat"]) || "";
  return { branch, status: status.trim(), diffStat: diffStat.trim() };
}

export function hasUncommittedChanges(workdir) {
  const status = run(workdir, ["status", "--short"]);
  return !!(status && status.trim());
}

export function commitAll(workdir, message) {
  run(workdir, ["add", "-A"]);
  const result = execFileSync("git", ["commit", "-m", message], { cwd: workdir, encoding: "utf8", timeout: 15000 });
  return result;
}
