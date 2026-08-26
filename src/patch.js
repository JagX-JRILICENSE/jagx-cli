/**
 * Apply a unified diff patch to a single file's content.
 * Supports standard @@ hunks for one file (no multi-file git patches).
 */
export function applyUnifiedPatch(original, patchText) {
  const oldLines = (original || "").split("\n");
  const result = [...oldLines];
  const lines = (patchText || "").replace(/\r\n/g, "\n").split("\n");

  let i = 0;
  // skip file headers --- +++ 
  while (i < lines.length && (lines[i].startsWith("---") || lines[i].startsWith("+++") || lines[i].startsWith("diff ") || lines[i].startsWith("index "))) {
    i++;
  }

  while (i < lines.length) {
    const header = lines[i];
    const m = header.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
    if (!m) {
      i++;
      continue;
    }
    const oldStart = parseInt(m[1], 10) - 1; // 0-based
    i++;

    const hunkLines = [];
    while (i < lines.length && !lines[i].startsWith("@@") && !lines[i].startsWith("---")) {
      hunkLines.push(lines[i]);
      i++;
    }

    // Build replacement for this hunk
    let cursor = oldStart;
    const inserts = [];
    let removeCount = 0;
    const toInsert = [];

    for (const hl of hunkLines) {
      if (hl.startsWith("\\")) continue; // "\ No newline at end of file"
      const tag = hl[0];
      const body = hl.slice(1);
      if (tag === " " || tag === undefined) {
        // context — verify optionally, advance
        if (removeCount > 0 || toInsert.length) {
          inserts.push({ at: cursor, remove: removeCount, add: toInsert.slice() });
          cursor += removeCount;
          removeCount = 0;
          toInsert.length = 0;
        }
        cursor++;
      } else if (tag === "-") {
        removeCount++;
      } else if (tag === "+") {
        toInsert.push(body);
      } else {
        // treat full line as context if malformed
        cursor++;
      }
    }
    if (removeCount > 0 || toInsert.length) {
      inserts.push({ at: cursor, remove: removeCount, add: toInsert.slice() });
    }

    // Apply from end so indices stay valid within this hunk's local view —
    // we apply to `result` using absolute positions collected before mutation
    // for this hunk only (hunks are sequential on original coordinates).
    // Recompute: apply on a working copy of the segment.
  }

  // Simpler reliable approach: rebuild from hunks in order on a working array
  return applyHunksSequential(oldLines, lines);
}

function applyHunksSequential(oldLines, patchLines) {
  const out = [];
  let oldIdx = 0;
  let i = 0;

  while (i < patchLines.length && (patchLines[i].startsWith("---") || patchLines[i].startsWith("+++") || patchLines[i].startsWith("diff ") || patchLines[i].startsWith("index "))) {
    i++;
  }

  while (i < patchLines.length) {
    const header = patchLines[i];
    const m = header.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
    if (!m) {
      i++;
      continue;
    }
    const oldStart = parseInt(m[1], 10) - 1;
    i++;

    // copy unchanged region before hunk
    while (oldIdx < oldStart && oldIdx < oldLines.length) {
      out.push(oldLines[oldIdx++]);
    }

    while (i < patchLines.length && !patchLines[i].startsWith("@@")) {
      if (patchLines[i].startsWith("---") || patchLines[i].startsWith("+++")) break;
      const hl = patchLines[i];
      i++;
      if (hl.startsWith("\\")) continue;
      const tag = hl[0];
      const body = hl.length ? hl.slice(1) : "";
      if (tag === " ") {
        out.push(body);
        oldIdx++;
      } else if (tag === "-") {
        oldIdx++;
      } else if (tag === "+") {
        out.push(body);
      }
    }
  }

  while (oldIdx < oldLines.length) {
    out.push(oldLines[oldIdx++]);
  }

  return out.join("\n");
}

/**
 * Produce a simple unified diff string for display/storage.
 */
export function toUnifiedDiff(path, oldText, newText) {
  const oldLines = (oldText || "").split("\n");
  const newLines = (newText || "").split("\n");
  const lines = [`--- a/${path}`, `+++ b/${path}`, `@@ -1,${oldLines.length} +1,${newLines.length} @@`];
  // naive full-file hunk for small files
  for (const l of oldLines) lines.push(`-${l}`);
  for (const l of newLines) lines.push(`+${l}`);
  return lines.join("\n");
}
