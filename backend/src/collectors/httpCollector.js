import * as cheerio from "cheerio";
import { safeGet } from "../utils/urlSafety.js";

// Collector A - HTTP/Public Web Collector.
// Fetches a permitted public page and extracts visible text content for
// downstream AI/rule-based extraction. Goes through safeGet() so every
// request (and every redirect hop) is checked against the SSRF guard -
// this collector will refuse to fetch anything that resolves to a private,
// loopback, or link-local address (including cloud metadata endpoints).
export async function collectFromUrl(url, { timeoutMs = 8000 } = {}) {
  const response = await safeGet(url, { timeoutMs });

  if (response.status >= 400) {
    throw new Error(`Source returned HTTP ${response.status}`);
  }

  const $ = cheerio.load(response.data);
  $("script, style, noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();

  return {
    sourceUrl: url,
    sourceType: "http",
    rawContent: text.slice(0, 20000),
  };
}
