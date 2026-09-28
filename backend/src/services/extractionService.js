import { extractFields } from "./aiClient.js";
import { ExtractedRecordsSchema } from "./schemas.js";

// Turns raw page-like content into ONE OR MORE structured records - a single
// page can list several entities (a directory of startups, an article naming
// multiple companies), and previously only one record per page was ever
// produced, which capped discovery at ~10 records per run.
//
// In demo mode the collector attaches a `structuredHint` (it "knows" the
// fields, simulating a clean source) so we skip the AI round-trip.
// Otherwise this calls the Python AI service for free-form extraction.
//
// THROWING is the contract for "this source produced nothing usable": the
// pipeline catches it and persists the source as an INVALID record with the
// reason attached, instead of silently returning `{}` and losing context.
export async function extractRecords(rawSourceItem, fields) {
  if (rawSourceItem.structuredHint) {
    const candidate = {};
    for (const f of fields) candidate[f] = rawSourceItem.structuredHint[f] ?? null;
    return [candidate];
  }

  const aiResult = await extractFields(rawSourceItem.rawContent, fields);
  const parsed = ExtractedRecordsSchema.safeParse(aiResult);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
    throw new Error(`AI extraction returned an unusable shape (${detail})`);
  }

  // Guarantee every requested field exists (missing → null) so downstream
  // normalization/validation sees a consistent record shape, while keeping
  // any extra keys the AI surfaced.
  const records = parsed.data.map((record) => {
    const out = {};
    for (const f of fields) out[f] = record[f] ?? null;
    for (const [k, v] of Object.entries(record)) if (!(k in out)) out[k] = v;
    return out;
  });

  if (records.length === 0 || records.every((r) => Object.values(r).every((v) => v === null || v === ""))) {
    throw new Error("AI could not extract any fields from this page");
  }
  return records;
}
