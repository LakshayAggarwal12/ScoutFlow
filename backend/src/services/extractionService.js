import { extractFields } from "./aiClient.js";
import { ExtractedRecordSchema } from "./schemas.js";
import { env } from "../config/env.js";

// Turns raw page-like content into a structured record.
// In demo mode the collector already attaches a `structuredHint` (it "knows"
// the fields, simulating a clean source) so we skip the AI round-trip and
// use it directly - this keeps demo runs fast and free of API dependencies.
// Otherwise this calls the Python AI service for ambiguous/free-form extraction.
export async function extractRecord(rawSourceItem, fields) {
  if (rawSourceItem.structuredHint) {
    const candidate = {};
    for (const f of fields) candidate[f] = rawSourceItem.structuredHint[f] ?? null;
    return candidate;
  }

  const aiResult = await extractFields(rawSourceItem.rawContent, fields);
  const parsed = ExtractedRecordSchema.safeParse(aiResult);
  if (!parsed.success) {
    // Extraction failure for a single source should not fail the whole task.
    return {};
  }
  return parsed.data;
}
