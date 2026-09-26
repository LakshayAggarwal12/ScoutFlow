import { prisma } from "../config/prisma.js";
import { collectDemo, collectFromUrl, searchSources, collectFromRemotive } from "../collectors/index.js";
import { env } from "../config/env.js";
import { logStep } from "./logService.js";

// Orchestrates source discovery + retrieval for a task. Tries real,
// permitted collectors first (multi-source: a public jobs API plus any
// configured search provider), persists a Source row for every attempt —
// including failed ones, so source health is visible — and only falls back
// to demo data when no real collector produced anything usable. Returns
// `usedMockData` so the dataset can be labeled honestly in the UI.
export async function collectSources(taskId, structuredRequirement) {
  if (env.demoMode) {
    const items = await collectDemo(structuredRequirement);
    const sources = await persistSources(taskId, items.map((item) => ({ item, ok: true })));
    return { sources, usedMockData: true };
  }

  const attempts = [];

  // Real collector 1: public jobs API, no credentials required.
  try {
    const remotiveItems = await collectFromRemotive(structuredRequirement);
    remotiveItems.forEach((item) => attempts.push({ item, ok: true }));
    await logStep(taskId, "COLLECTION", "RUNNING", `Remotive API returned ${remotiveItems.length} sources`);
  } catch (err) {
    await logStep(taskId, "COLLECTION", "ERROR", `Remotive collector failed: ${err.message}`);
  }

  // Real collector 2: configured search provider (behind an interface —
  // see collectors/searchCollector.js) plus generic page fetches.
  try {
    const candidateUrls = await searchSources(
      [...(structuredRequirement.keywords || []), structuredRequirement.entity].join(" "),
      { limit: structuredRequirement.limit }
    );
    if (candidateUrls.length > 0) {
      const settled = await Promise.allSettled(candidateUrls.map((c) => collectFromUrl(c.url)));
      settled.forEach((r, idx) => {
        if (r.status === "fulfilled") attempts.push({ item: r.value, ok: true });
        else attempts.push({ item: { sourceUrl: candidateUrls[idx].url, sourceType: "http" }, ok: false, error: r.reason?.message });
      });
    }
  } catch (err) {
    await logStep(taskId, "COLLECTION", "ERROR", `Search collector failed: ${err.message}`);
  }

  let usedMockData = false;
  if (attempts.filter((a) => a.ok).length === 0) {
    // No real collector produced usable results (no provider configured,
    // provider unreachable, etc.) — fall back to demo data rather than
    // failing the task, but flag the dataset as mock so the UI is honest.
    await logStep(taskId, "COLLECTION", "RUNNING", "No real sources found — falling back to demo data");
    const demoItems = await collectDemo(structuredRequirement);
    demoItems.forEach((item) => attempts.push({ item, ok: true }));
    usedMockData = true;
  }

  const sources = await persistSources(taskId, attempts);
  return { sources, usedMockData };
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
