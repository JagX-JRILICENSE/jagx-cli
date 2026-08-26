/**
 * Extract a single JSON object from model output.
 * Handles markdown fences, leading/trailing prose, and nested braces.
 */
export function extractJson(text) {
  if (!text || typeof text !== "string") return null;
  const cleaned = text.trim();

  // Direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fallthrough */
  }

  // Fenced ```json ... ```
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* fallthrough */
    }
  }

  // First balanced { ... }
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function isToolAction(obj) {
  if (!obj || typeof obj !== "object") return false;
  if (typeof obj.final === "string") return true;
  if (typeof obj.tool === "string") return true;
  if (Array.isArray(obj.tools) && obj.tools.length) return true;
  if (Array.isArray(obj.plan)) return true;
  return false;
}
