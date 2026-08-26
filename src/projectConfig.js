import fs from "node:fs";
import path from "node:path";

export function loadProjectConfig(workdir) {
  try {
    const raw = fs.readFileSync(path.join(workdir, "jagx.config.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Detect a reasonable test command for common stacks.
 */
export function detectTestCommand(workdir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(workdir, "package.json"), "utf8"));
    if (pkg.scripts?.test) return "npm test";
  } catch {
    // ignore
  }

  if (fs.existsSync(path.join(workdir, "pyproject.toml")) || fs.existsSync(path.join(workdir, "pytest.ini"))) {
    return "pytest -q";
  }
  if (fs.existsSync(path.join(workdir, "go.mod"))) {
    return "go test ./...";
  }
  if (fs.existsSync(path.join(workdir, "Cargo.toml"))) {
    return "cargo test";
  }
  if (fs.existsSync(path.join(workdir, "composer.json"))) {
    return "composer test";
  }
  if (fs.existsSync(path.join(workdir, "Gemfile"))) {
    return "bundle exec rspec";
  }
  return null;
}
