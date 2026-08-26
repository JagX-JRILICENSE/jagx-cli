const RED = "\x1b[31m", GREEN = "\x1b[32m", DIM = "\x1b[2m", RESET = "\x1b[0m";

export function lineDiff(oldText, newText) {
  const oldLines = (oldText || "").split("\n");
  const newLines = (newText || "").split("\n");
  if (oldLines.length > 2000 || newLines.length > 2000) {
    return { tooLarge: true, oldCount: oldLines.length, newCount: newLines.length };
  }
  const m = oldLines.length, n = newLines.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) { ops.push({ type: "same", line: oldLines[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: "del", line: oldLines[i] }); i++; }
    else { ops.push({ type: "add", line: newLines[j] }); j++; }
  }
  while (i < m) { ops.push({ type: "del", line: oldLines[i] }); i++; }
  while (j < n) { ops.push({ type: "add", line: newLines[j] }); j++; }
  return { ops };
}

export function renderDiff(diffResult, contextLines = 2) {
  if (diffResult.tooLarge) {
    return `${DIM}File too large for a line-by-line diff (${diffResult.oldCount} → ${diffResult.newCount} lines). Proceeding without preview.${RESET}`;
  }
  const { ops } = diffResult;
  const lines = [];
  ops.forEach((op, idx) => {
    if (op.type === "same") {
      const nearChange =
        (idx + contextLines < ops.length && ops.slice(idx, idx + contextLines + 1).some((o) => o.type !== "same")) ||
        (idx - contextLines >= 0 && ops.slice(Math.max(0, idx - contextLines), idx).some((o) => o.type !== "same"));
      if (nearChange) lines.push(`${DIM}  ${op.line}${RESET}`);
    } else if (op.type === "add") {
      lines.push(`${GREEN}+ ${op.line}${RESET}`);
    } else {
      lines.push(`${RED}- ${op.line}${RESET}`);
    }
  });
  return lines.join("\n") || `${DIM}(no visible line changes)${RESET}`;
}
