import { safeGet } from "../utils/urlSafety.js";

const REMOTIVE_API = "https://remotive.com/api/remote-jobs";

// Collector C - a real, publicly-documented, no-API-key-required jobs API
// (Remotive: https://remotive.com/api-documentation). This is the "real
// collection instead of only mock data" path for job/internship requirements
// when DEMO_MODE is off. Remotive's response is already structured JSON, so
// - the same way the demo collector does - each item carries a
// `structuredHint` and the extraction stage can skip the AI/regex step for it.
//
// Note: this collector calls out to a public third-party API. If that
// network call fails (offline environment, provider outage, provider
// changed shape), it throws, and the caller (collectionService) is
// responsible for falling back to demo data so the task can still complete.
export async function collectFromRemotive(structuredRequirement) {
  const { keywords = [], limit = 50 } = structuredRequirement;
  const search = keywords.filter((k) => k !== "internship").join(" ") || structuredRequirement.entity;

  const response = await safeGet(REMOTIVE_API, {
    timeoutMs: 10000,
    params: { search, limit: Math.min(limit, 100) },
  });

  if (response.status >= 400) {
    throw new Error(`Remotive API returned HTTP ${response.status}`);
  }

  const jobs = Array.isArray(response.data?.jobs) ? response.data.jobs : [];

  return jobs.map((job) => ({
    sourceUrl: job.url,
    sourceType: "remotive-api",
    rawContent: [
      job.title,
      job.company_name,
      job.candidate_required_location,
      job.salary || "Not disclosed",
      `Posted ${job.publication_date}`,
      `Apply: ${job.url}`,
    ].join("\n"),
    structuredHint: {
      company_name: job.company_name,
      role: job.title,
      location: job.candidate_required_location,
      salary: job.salary || null,
      posting_date: job.publication_date,
      application_url: job.url,
    },
  }));
}
