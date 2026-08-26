import dns from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 200_000;

async function isPublicHost(hostname) {
  try {
    const addrs = await dns.lookup(hostname, { all: true });
    return addrs.every(({ address }) => {
      if (net.isIP(address) === 0) return false;
      if (address.startsWith("127.") || address.startsWith("10.") || address.startsWith("192.168.")) return false;
      if (address.startsWith("169.254.")) return false;
      if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) return false;
      if (address === "::1") return false;
      return true;
    });
  } catch {
    return false;
  }
}

export async function fetchUrlTool(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only http/https URLs are allowed.");
  if (!(await isPublicHost(parsed.hostname))) throw new Error("Refused: URL resolves to a private/local address.");
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    body: text.slice(0, MAX_BYTES),
  };
}
