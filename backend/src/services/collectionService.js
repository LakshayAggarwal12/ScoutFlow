import { prisma } from "../config/prisma.js";
import { collectDemo, collectFromUrl, searchSources, collectFromRemotive } from "../collectors/index.js";
import { env } from "../config/env.js";
import { logStep } from "./logService.js";
import { mapWithConcurrency } from "../utils/concurrency.js";
import { AppError } from "../utils/AppError.js";

// Orchestrates source discovery + retrieval for a task. Tries real,
// permitted collectors first (multi-source: a public jobs API plus a
// multi-variant/paginated search pass), persists a Source row for every
// attempt - including failed ones, so source health is visible - and only
// falls back to demo data when ALLOW_DEMO_FALLBACK permits it. Returns
// `usedMockData` so the dataset can be labeled honestly in the UI.
export async function collectSources(taskId, structuredRequirement) {
  if (env.demoMode) {
    const items = await collectDemo(structuredRequirement);
    const sources = await persistSources(taskId, items.map((item) => ({ item, ok: true })));
    return { sources, usedMockData: true };
  }

  const attempts = [];

  // Real collector 1: public jobs API, no credentials required.
  if (structuredRequirement.entity === "job") {
    try {
      const remotiveItems = await collectFromRemotive(structuredRequirement);
      remotiveItems.forEach((item) => attempts.push({ item, ok: true }));
      await logStep(taskId, "COLLECTION", "RUNNING", `Remotive API returned ${remotiveItems.length} sources`);
    } catch (err) {
      await logStep(taskId, "COLLECTION", "ERROR", `Remotive collector failed: ${err.message}`);
    }
  }

  // Real collector 2: search discovery (query variants + pagination, see
  // collectors/searchCollector.js) plus generic page fetches through a
  // bounded concurrency pool.
  try {
    const variants = buildSearchVariants(structuredRequirement);
    await logStep(taskId, "COLLECTION", "RUNNING", `Searching ${variants.length} query variant(s): ${variants.join(" | ")}`);
    // Fast profile: cap discovery (MAX_SOURCES) regardless of requested limit —
    // one listicle yields many records, so 12 pages cover a 50-record ask.
    const requestedLimit = Math.min(Math.max(structuredRequirement.limit || 20, 10), 40);
    const targetUrls = env.maxSources > 0 ? Math.min(requestedLimit, env.maxSources) : requestedLimit;
    const candidateUrls = await searchSources(variants, {
      limit: targetUrls,
      maxQueries: env.searchMaxQueries,
      pagesPerQuery: env.searchPagesPerQuery,
    });

    const fetched = await mapWithConcurrency(candidateUrls, env.fetchConcurrency, (candidate) =>
      collectFromUrl(candidate.url, {
        fallbackContext: { title: candidate.title, snippet: candidate.snippet, date: candidate.date },
      })
    );
    fetched.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        attempts.push({ item: result.value, ok: true });
      } else {
        // Fetch failed (JS wall / bot wall / timeout) but Serper's snippet
        // often already names the entities - keep it as a minimal source so
        // extraction can still read SOMETHING instead of dropping the URL.
        const candidate = candidateUrls[idx];
        const snippet = (candidate.snippet || "").trim();
        const title = (candidate.title || "").trim();
        if (snippet.length >= 80 || title.length >= 10) {
          const headerParts = [];
          if (title) headerParts.push(`Search result title: ${title}`);
          if (snippet) headerParts.push(`Search snippet: ${snippet}`);
          if (candidate.date) headerParts.push(`Published: ${candidate.date}`);
          headerParts.push(`Source page: ${candidate.url} (full page could not be fetched: ${result.reason?.message || "fetch failed"}; extracting from search snippet)`);
          attempts.push({
            item: { sourceUrl: candidate.url, sourceType: "search-snippet", rawContent: headerParts.join("\n") },
            ok: true,
          });
        } else {
          attempts.push({
            item: { sourceUrl: candidate.url, sourceType: "http" },
            ok: false,
            error: result.reason?.message,
          });
        }
      }
    });
  } catch (err) {
    await logStep(taskId, "COLLECTION", "ERROR", `Search collector failed: ${err.message}`);
  }

  let sources = await persistSources(taskId, attempts);
  let usedMockData = false;

  if (sources.length === 0) {
    if (env.allowDemoFallback) {
      // Fallback explicitly enabled: usable locally for demos, but flagged so
      // the UI never pretends this was real collected data.
      await logStep(
        taskId,
        "COLLECTION",
        "ERROR",
        "No real sources collected - ALLOW_DEMO_FALLBACK is on, using demo data (dataset will be flagged as mock)"
      );
      const demoItems = await collectDemo(structuredRequirement);
      sources = await persistSources(
        taskId,
        demoItems.map((item) => ({ item, ok: true }))
      );
      usedMockData = true;
    } else {
      // Production posture: fail loudly rather than serve fabricated data.
      await logStep(
        taskId,
        "COLLECTION",
        "ERROR",
        "No real sources collected and ALLOW_DEMO_FALLBACK=false - failing instead of returning demo data"
      );
      throw new AppError(
        "Collection produced no usable sources - check SERPER_API_KEY, API quota, and source availability",
        502
      );
    }
  }

  return { sources, usedMockData };
}

// Query fan-out: one generic query per run was the main reason discovery
// stalled at ~10 URLs. Generate a few focused variants from the structured
// requirement instead (the search collector dedupes their results).
export function buildSearchVariants(req = {}) {
  const keywords = (req.keywords || []).join(" ").trim();
  const location = (req.location || "").trim();
  const entity = (req.entity || "record").trim();
  const clean = (s) => String(s).replace(/\s+/g, " ").trim();

  const variants = [
    clean([keywords, entity, location].join(" ")),
    clean([entity, location, keywords].join(" ")),
  ];
  if (location) variants.push(clean(`${keywords} in ${location}`));

  if (entity === "company" || entity === "startup") {
    if (location) variants.push(clean(`list of ${keywords || "top"} startups in ${location}`));
    variants.push(clean(`${keywords || "top"} ${entity} directory ${location}`));
    variants.push(clean(`best ${keywords} companies ${location ? `in ${location}` : ""}`));
  } else if (entity === "job") {
    variants.push(clean(`${keywords} jobs ${location ? `in ${location}` : ""}`));
  }

  return [...new Set(variants.filter(Boolean))];
}

async function persistSources(taskId, attempts) {
  const sources = [];
  for (const { item, ok, error } of attempts) {
    const source = await prisma.source.create({
      data: {
        taskId,
        url: item.sourceUrl || "unknown",
        type: item.sourceType || "unknown",
        status: ok ? "COLLECTED" : "FAILED",
        errorMessage: error || null,
        checkedAt: new Date(),
        metadata: ok ? { rawContentPreview: item.rawContent?.slice(0, 500) } : undefined,
      },
    });
    if (ok) sources.push({ source, raw: item });
  }
  return sources;
}
