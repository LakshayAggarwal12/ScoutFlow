import axios from "axios";
import * as cheerio from "cheerio";

// Collector B - Search/API Collector.
// Scrapes DuckDuckGo HTML version to freely find relevant URLs for ANY task,
// bypassing the need for paid Search API keys (SerpApi/Google).
export async function searchSources(query, { limit = 10 } = {}) {
  try {
    const response = await axios.get("https://html.duckduckgo.com/html/", {
      params: { q: query },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // Parse the classic DDG HTML layout
    $(".result__a").each((i, el) => {
      if (results.length >= limit) return;

      const href = $(el).attr("href");
      const title = $(el).text();

      let finalUrl = href;
      // DDG sometimes uses a redirect wrapper: //duckduckgo.com/l/?uddg=https%3A%2F%2F...
      if (href && href.includes("uddg=")) {
        const urlParam = href.split("uddg=")[1]?.split("&")[0];
        if (urlParam) {
          finalUrl = decodeURIComponent(urlParam);
        }
      }

      if (finalUrl && finalUrl.startsWith("http")) {
        results.push({ url: finalUrl, title: title.trim() });
      }
    });

    return results;
  } catch (error) {
    console.error(`DuckDuckGo search failed for query "${query}":`, error.message);
    return [];
  }
}
