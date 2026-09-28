import * as cheerio from "cheerio";
import { safeGet } from "../utils/urlSafety.js";

// Collector A - HTTP/Public Web Collector.
// Fetches a permitted public page and extracts visible text content for
// downstream AI/rule-based extraction. Goes through safeGet() so every
// request (and every redirect hop) is checked against the SSRF guard.
//
// Content-quality gate: a page that is too short, behind a bot/captcha wall,
// or JS-only produces garbage records downstream (or worse, empty records
// that used to be silently dropped) - so those fetches FAIL HERE with an
// explicit reason instead of entering the pipeline.

// Visible-text phrases indicating the page never delivered real content.
const BOT_WALL_PATTERNS = [
  /verify (?:that )?you'?re a human/i,
  /you'?re a human/i,
  /are you a robot/i,
  /unusual traffic/i,
  /automated queries/i,
  /we think you might be a bot/i,
  /checking your browser/i,
  /please enable javascript/i,
  /enable javascript to continue/i,
  /turn javascript on/i,
  /complete the security check/i,
  /captcha/i,
  /access denied/i,
  /temporarily blocked/i,
  /too many requests/i,
];
const MIN_TEXT_LENGTH = 400;

const TRANSIENT_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNABORTED", "EAI_AGAIN", "EPIPE"]);

export async function collectFromUrl(url, { timeoutMs = 8000, retries = 1 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchOnce(url, timeoutMs);
    } catch (err) {
      lastError = err;
      if (!TRANSIENT_CODES.has(err.code) || attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function fetchOnce(url, timeoutMs) {
  const response = await safeGet(url, { timeoutMs });

  if (response.status >= 400) {
    throw new Error(`Source returned HTTP ${response.status}`);
  }

  const $ = cheerio.load(response.data);
  $("script, style, noscript, svg, iframe").remove();

  const visibleText = ($("body").text() || "").replace(/\s+/g, " ").trim();

  for (const pattern of BOT_WALL_PATTERNS) {
    if (pattern.test(visibleText)) {
      throw new Error(`Bot/captcha wall detected (matched "${pattern.source}")`);
    }
  }
  if (visibleText.length < MIN_TEXT_LENGTH) {
    throw new Error(`Content too short (${visibleText.length} < ${MIN_TEXT_LENGTH} chars) - likely JS-rendered or empty`);
  }

  // Prefer the semantic content container so nav/footer chrome doesn't
  // dominate what downstream extraction sees.
  let $container = $("main, article, [role=main]").first();
  if ($container.length === 0) {
    $container = $("body");
    $container.find("header a, footer a, nav a").remove();
  }

  // Keep link targets in the text: directory/listicle pages often carry the
  // entity's website only in the anchor href, which .text() would strip.
  // Render as "Anchor text (https://…)" so extraction can see the URL.
  $container.find("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!/^https?:\/\//i.test(href)) return;
    const anchorText = ($(el).text() || "").replace(/\s+/g, " ").trim();
    if (anchorText.includes(href)) return;
    $(el).text(anchorText ? `${anchorText} (${href})` : href);
  });

  const text = ($container.text() || "").replace(/\s+/g, " ").trim();

  return {
    sourceUrl: url,
    sourceType: "http",
    rawContent: (text || visibleText).slice(0, 20000),
  };
}
