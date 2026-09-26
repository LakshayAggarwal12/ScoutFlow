import { DEMO_JOB_LISTINGS } from "./demoData.js";

// Simulates source discovery + retrieval so the full pipeline can run
// without any external network access. Used when DEMO_MODE=true or when
// a real collector fails/has no configured provider.
export async function collectDemo(structuredRequirement) {
  const { limit = 50, keywords = [], location } = structuredRequirement || {};

  let items = DEMO_JOB_LISTINGS;

  if (keywords?.length) {
    const kw = keywords.map((k) => k.toLowerCase());
    items = items.filter((item) =>
      kw.some((k) => `${item.role} ${item.company_name}`.toLowerCase().includes(k))
    );
    if (items.length === 0) items = DEMO_JOB_LISTINGS; // demo fallback: still show something
  }

  if (location && String(location).toLowerCase() !== "india") {
    const loc = String(location).toLowerCase();
    const filtered = items.filter((item) => item.location.toLowerCase().includes(loc));
    if (filtered.length > 0) items = filtered;
  }

  items = items.slice(0, Math.max(limit, items.length > limit ? limit : items.length));

  // Shape matches what a real collector would hand to the extraction step:
  // one "source" with raw page-like content per listing.
  return items.map((item, idx) => ({
    sourceUrl: item.source_url,
    sourceType: "demo",
    rawContent: `${item.role}\n${item.company_name}\n${item.location}\n${item.salary || "Not disclosed"}\nPosted ${item.posting_date}\nApply: ${item.application_url || "N/A"}`,
    structuredHint: item, // demo collector already "knows" the fields; extractor still runs
  }));
}
