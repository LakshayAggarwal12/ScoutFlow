import dns from "node:dns/promises";
import net from "node:net";
import axios from "axios";

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0"]);

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local / cloud metadata (169.254.169.254)
    if (a === 0) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    if (lower.startsWith("fe80")) return true; // link-local
    return false;
  }
  return true; // unrecognized shape - fail closed
}

// Validates a URL is safe to fetch server-side: http(s) only, and every
// address it resolves to is a public address. This is the core SSRF guard -
// collectors must never let a URL (AI-suggested, user-supplied, or from a
// third-party API) reach the internal network or cloud metadata endpoints.
export async function assertUrlIsSafe(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`Blocked protocol: ${url.protocol}`);
  }
  if (BLOCKED_HOSTNAMES.has(url.hostname)) {
    throw new Error(`Blocked host: ${url.hostname}`);
  }

  let addresses;
  try {
    addresses = await dns.lookup(url.hostname, { all: true });
  } catch {
    throw new Error(`Could not resolve host: ${url.hostname}`);
  }
  if (addresses.length === 0) {
    throw new Error(`Host resolved to no addresses: ${url.hostname}`);
  }
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error(`Blocked private/internal address for ${url.hostname}: ${address}`);
    }
  }
  return url;
}

// SSRF-safe GET: validates the URL (and every redirect hop) before each
// request rather than trusting axios's own redirect-follow, since a
// validated URL could otherwise 3xx its way into an internal address.
export async function safeGet(rawUrl, { timeoutMs = 8000, params, maxHops = 3 } = {}) {
  let current = rawUrl;
  for (let hop = 0; hop <= maxHops; hop++) {
    await assertUrlIsSafe(current);
    const response = await axios.get(current, {
      timeout: timeoutMs,
      params: hop === 0 ? params : undefined,
      maxRedirects: 0,
      headers: { "User-Agent": "AI-Data-Intelligence-Prototype/0.2 (+mvp)" },
      validateStatus: (status) => status < 400 || (status >= 300 && status < 400),
    });
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      current = new URL(response.headers.location, current).toString();
      continue;
    }
    return response;
  }
  throw new Error(`Too many redirects fetching ${rawUrl}`);
}
