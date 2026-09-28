import axios from "axios";
import { env } from "../config/env.js";

// Collector B - Search API Collector using Serper.dev
// Extremely reliable Google Search results. Requires a free API key (2500 free queries).
export async function searchSources(query, { limit = 10 } = {}) {
  if (!env.serperApiKey) {
    throw new Error("SERPER_API_KEY is not configured in .env. Skipping real search.");
  }

  try {
    const data = JSON.stringify({
      q: query,
      num: limit,
    });

    const response = await axios.post("https://google.serper.dev/search", data, {
      headers: {
        "X-API-KEY": env.serperApiKey,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    const results = [];
    
    // Add organic results
    if (response.data && response.data.organic) {
      response.data.organic.forEach((item) => {
        if (item.link && item.link.startsWith("http")) {
          results.push({ url: item.link, title: item.title });
        }
      });
    }

    return results.slice(0, limit);
  } catch (error) {
    console.error(`Serper search failed for query "${query}":`, error.response?.data || error.message);
    throw new Error(`Serper search failed: ${error.message}`);
  }
}

