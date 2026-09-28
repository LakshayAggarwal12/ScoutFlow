import axios from "axios";
import { env } from "../config/env.js";

// Collector B - Search API Collector using Serper.dev.
//
// Discovery depth fixes (the old version ran ONE query, read the first page
// only, and silently stopped at Serper's ~10 organic results - so a
// "50 records" request could never discover more than ~10 pages):
// - multiple query variants derived from the structured requirement;
// - pagination (`page`) until enough unique URLs are found or pages run out;
// - a blocklist for hosts that never yield extractable text (login walls,
//   video players, social feeds), so fetch/LLM budget isn't wasted on them.
// Each (query x page) pair costs one Serper query, hence maxQueries/pages caps.

const BLOCKED_HOST_RE =
  /(^|\.)(youtube\.com|youtu\.be|linkedin\.com|x\.com|twitter\.com|facebook\.com|instagram\.com|tiktok\.com|pinterest\.[a-z.]+|quora\.com|reddit\.com|google\.[a-z.]+|amazon\.[a-z.]+)$/i;

const BLOCKED_PATH_RE = /\/(login|signin|signup|register|account|checkout|cart)(\/|$|\?)/i;

function isBlockedUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return true;
  }
  if (!/^https?:$/.test(url.protocol)) return true;
  if (BLOCKED_HOST_RE.test(url.hostname)) return true;
  if (BLOCKED_PATH_RE.test(`${url.pathname}${url.search}`)) return true;
  return false;
}

export async function searchSources(queries, { limit = 20, maxQueries = env.searchMaxQueries, pagesPerQuery = env.searchPagesPerQuery ?? 1 } = {}) {
  if (!env.serperApiKey) {
    throw new Error("SERPER_API_KEY is not configured in .env. Skipping real search.");
  }

  const queryList = [
    ...new Set(
      (Array.isArray(queries) ? queries : [queries])
        .map((q) => String(q || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
    ),
  ].slice(0, maxQueries);
  if (queryList.length === 0) {
    throw new Error("No search queries to run");
  }

  const results = [];
  const seen = new Set();

  for (const query of queryList) {
    for (let page = 1; page <= pagesPerQuery; page++) {
      if (results.length >= limit) break;

      let payload;
      try {
        const response = await axios.post(
          "https://google.serper.dev/search",
          { q: query, num: 10, page },
          {
            headers: { "X-API-KEY": env.serperApiKey, "Content-Type": "application/json" },
            timeout: 10000,
          }
        );
        payload = response.data;
      } catch (error) {
        console.error(`Serper search failed for query "${query}" page ${page}:`, error.response?.data || error.message);
        break; // try the next query instead of aborting discovery entirely
      }

      const organic = payload?.organic || [];
      if (organic.length === 0) break; // no further results for this query

      for (const item of organic) {
        if (!item.link || results.length >= limit) continue;
        if (isBlockedUrl(item.link)) continue;
        const key = item.link.replace(/[#?].*$/, "");
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ url: item.link, title: item.title });
      }
    }
  }

  if (results.length === 0) {
    throw new Error(`Serper returned no usable results for ${queryList.length} queries`);
  }
  return results;
}

