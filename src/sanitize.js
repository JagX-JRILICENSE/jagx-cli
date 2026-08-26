/**
 * Strip zero-width / bidi / format characters that some backends inject
 * as invisible watermarks. Safe for both terminal display and file writes.
 */
const INVISIBLE_RE =
  /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\u00AD]/g;

export function sanitizeText(text) {
  if (text == null) return "";
  return String(text).replace(INVISIBLE_RE, "");
}

/** Sanitize nested string fields in a parsed tool action (mutates a copy). */
export function sanitizeAction(action) {
  if (!action || typeof action !== "object") return action;
  const out = { ...action };
  if (typeof out.final === "string") out.final = sanitizeText(out.final);
  if (typeof out.tool === "string") out.tool = sanitizeText(out.tool);
  if (out.input && typeof out.input === "object") {
    out.input = { ...out.input };
    for (const [k, v] of Object.entries(out.input)) {
      if (typeof v === "string") out.input[k] = sanitizeText(v);
    }
  }
  if (Array.isArray(out.plan)) {
    out.plan = out.plan.map((p) => (typeof p === "string" ? sanitizeText(p) : p));
  }
  return out;
}
