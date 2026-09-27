import axios from "axios";
import { env } from "../config/env.js";

// Collector B - Search/API Collector.
// Behind a small provider interface so a real search/jobs API can be
// swapped in later via environment variables without touching callers.
export async function searchSources(query, { limit = 10 } = {}) {
  const provider = process.env.SEARCH_PROVIDER;
  const apiKey = process.env.SEARCH_API_KEY;

  if (!provider || !apiKey) {
    // No provider configured - the workflow engine falls back to the
    // demo collector for the prototype. This keeps the interface real
    // (same call shape) without requiring paid credentials to run.
    return [];
  }

  // Example shape for a generic provider; adapt per real API.
  const response = await axios.get(provider, {
    params: { q: query, limit },
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 8000,
  });

  return (response.data?.results || []).map((r) => ({ url: r.url, title: r.title }));
}
