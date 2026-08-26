import { fetchUrlTool } from "./netTools.js";

/**
 * Live preview check — fetch a URL and report status, title, obvious errors.
 * No headless browser dependency (Codex-competitive "does it load?" signal).
 */
export async function previewUrl(url) {
  const res = await fetchUrlTool(url);
  const body = res.body || "";
  const titleMatch = body.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;
  const hasError =
    /error|exception|traceback|cannot get|not found/i.test(body.slice(0, 5000)) &&
    res.status >= 400;

  const findings = [];
  if (res.status >= 400) findings.push(`HTTP ${res.status}`);
  if (hasError) findings.push("Body looks like an error page");
  if (!title && res.status < 400) findings.push("No <title> found");

  return {
    status: res.status,
    title,
    findings,
    snippet: body.slice(0, 800),
    headers: {
      "content-type": res.headers["content-type"],
      server: res.headers["server"],
    },
  };
}

export function formatPreview(result) {
  const lines = [
    `status: ${result.status}`,
    result.title ? `title: ${result.title}` : "title: (none)",
    `content-type: ${result.headers["content-type"] || "?"}`,
  ];
  if (result.findings.length) lines.push(`findings: ${result.findings.join("; ")}`);
  lines.push(`snippet:\n${result.snippet}`);
  return lines.join("\n");
}
