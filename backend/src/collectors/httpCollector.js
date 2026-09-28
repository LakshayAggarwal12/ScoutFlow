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
// Boilerplate selectors stripped before text extraction. The old version kept
// nav/header/footer/cookie banners/language pickers in the flattened text, so
// the first ~2000 chars the LLM ever saw were menus ("Global (English)
// Africa (English) ...") and the real entities were truncated away.
const BOILERPLATE_SELECTORS = [
  "header",
  "footer",
  "nav",
  "[role=navigation]",
  "[role=banner]",
  "[role=contentinfo]",
  ".cookie-banner",
  ".cookie-consent",
  "#cookie-banner",
  "[aria-label*=cookie i]",
  "[aria-label*=language i]",
  "[class*=language-selector i]",
  "[class*=locale-picker i]",
  "[class*=cookie i]",
  "[class*=newsletter i]",
  "[class*=subscribe-popup i]",
  "[class*=share-buttons i]",
  "[class*=social-share i]",
  ".breadcrumb",
  "[aria-label=breadcrumb]",
];
const MIN_TEXT_LENGTH = 400;

const TRANSIENT_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNABORTED", "EAI_AGAIN", "EPIPE"]);

// Keep enough content for the LLM window (6000 chars) plus headroom for the
// source-context header extraction prepends. Truncation is head-based because
// lead paragraphs/listings carry the entities; boilerplate is stripped first.
const MAX_RAW_CHARS = 12000;

export async function collectFromUrl(url, { timeoutMs = 8000, retries = 1, fallbackContext = null } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchOnce(url, timeoutMs, fallbackContext);
    } catch (err) {
      lastError = err;
      if (!TRANSIENT_CODES.has(err.code) || attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }
  throw lastError;
}

function buildContextHeader(fallbackContext) {
  if (!fallbackContext) return "";
  const title = (fallbackContext.title || "").trim();
  const snippet = (fallbackContext.snippet || "").trim();
  const date = (fallbackContext.date || "").trim();
  const parts = [];
  if (title) parts.push(`Search result title: ${title}`);
  if (snippet) parts.push(`Search snippet: ${snippet}`);
  if (date) parts.push(`Published: ${date}`);
  if (parts.length === 0) return "";
  return `${parts.join("\n")}\n\n--- Page content below ---\n`;
}

// Collapse runs of the same sentence/phrase pasted site-wide (share rows,
// "Copy link" ribbons). The old flattener kept every duplicate, so menus
// repeated 3-4x ate the LLM window before real content started.
// Newlines (entity-per-line structure) are preserved so the LLM can split
// one page into many records.
function collapseRepeats(text) {
  const lines = text.split(/\n+/);
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const parts = line.split(/(?<=[.!?])\s{2,}|(?<=[.!?])\s+(?=[A-Z])/);
    const kept = [];
    for (const s of parts) {
      const key = s.trim().toLowerCase();
      if (key.length < 24) {
        kept.push(s);
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push(s);
    }
    const joined = kept.join(" ").trim();
    if (joined) out.push(joined);
  }
  return out.join("\n");
}

async function fetchOnce(url, timeoutMs, fallbackContext) {
  const response = await safeGet(url, { timeoutMs });

  if (response.status >= 400) {
    throw new Error(`Source returned HTTP ${response.status}`);
  }

  const $ = cheerio.load(response.data);
  $("script, style, noscript, svg, iframe").remove();
  $(BOILERPLATE_SELECTORS.join(",")).remove();

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

  // Preserve block boundaries (headings, paragraphs, list items) as newlines
  // instead of flattening everything to one line: entity-per-line structure
  // is what lets the extractor split "one page -> many records".
  const blocks = [];
  $container
    .find("h1, h2, h3, h4, p, li, tr, dd, dt, blockquote")
    .each((_, el) => {
      const t = ($(el).text() || "").replace(/\s+/g, " ").trim();
      if (t.length >= 20) blocks.push(t);
    });
  let text = blocks.length > 0 ? blocks.join("\n") : ($container.text() || "").replace(/\s+/g, " ").trim();
  text = collapseRepeats(text);

  const header = buildContextHeader(fallbackContext);
  const budget = Math.max(2000, MAX_RAW_CHARS - header.length);
  const rawContent = `${header}${(text || visibleText).slice(0, budget)}`.slice(0, MAX_RAW_CHARS);

  return {
    sourceUrl: url,
    sourceType: "http",
    rawContent,
  };
}
