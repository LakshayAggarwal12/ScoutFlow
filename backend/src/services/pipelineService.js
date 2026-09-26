import { prisma } from "../config/prisma.js";
import { normalizeRecordFields } from "../utils/normalize.js";
import { buildDedupeKey } from "../utils/dedupe.js";
import { validateRecord } from "../utils/validate.js";
import { extractRecord } from "./extractionService.js";
import { logStep } from "./logService.js";

// Runs extract -> normalize -> deduplicate -> validate -> store as distinct
// phases over the whole batch of collected sources (rather than interleaved
// per-record), matching the pipeline stages the frontend visualizes, and
// returns statistics for the task.
//
// `usedMockData` is stamped onto the Dataset so the UI can honestly label
// demo-mode runs. `version` supports basic dataset versioning: each rerun of
// a task creates a new Dataset row rather than overwriting the previous one.
export async function runPipeline(task, sources, { usedMockData = false } = {}) {
  const requestedFields = task.structuredRequirement.fields;

  const previousDataset = await prisma.dataset.findFirst({
    where: { taskId: task.id },
    orderBy: { version: "desc" },
  });
  const version = (previousDataset?.version || 0) + 1;

  const dataset = await prisma.dataset.create({
    data: {
      taskId: task.id,
      name: `${task.structuredRequirement.entity}-dataset`,
      version,
      usedMockData,
    },
  });

  const stats = { discovered: sources.length, valid: 0, invalid: 0, partial: 0, duplicates: 0, final: 0 };

  // --- Extraction ---
  await logStep(task.id, "EXTRACTION", "RUNNING", `Extracting ${sources.length} sources`);
  const extractedItems = [];
  for (const { source, raw } of sources) {
    try {
      const extracted = await extractRecord(raw, requestedFields);
      extractedItems.push({ source, extracted });
    } catch (err) {
      await logStep(task.id, "EXTRACTION", "ERROR", `Source ${source.url} failed: ${err.message}`);
      // A single source failure does not fail the whole task.
    }
  }
  await logStep(task.id, "EXTRACTION", "COMPLETED", `${extractedItems.length}/${sources.length} sources extracted`);

  // --- Normalization ---
  const normalizedItems = extractedItems.map(({ source, extracted }) => ({
    source,
    normalized: normalizeRecordFields(extracted, new Date()),
  }));
  await logStep(task.id, "NORMALIZATION", "COMPLETED", `${normalizedItems.length} records normalized`);

  // --- Deduplication ---
  const seenKeys = new Set();
  const deduped = [];
  for (const item of normalizedItems) {
    const dedupeKey = buildDedupeKey(item.normalized);
    if (seenKeys.has(dedupeKey)) {
      stats.duplicates += 1;
      continue;
    }
    seenKeys.add(dedupeKey);
    deduped.push({ ...item, dedupeKey });
  }
  await logStep(task.id, "DEDUPLICATION", "COMPLETED", `${stats.duplicates} duplicates removed`, {
    remaining: deduped.length,
  });

  // --- Validation ---
  const validated = deduped.map((item) => {
    const { status, errors } = validateRecord(item.normalized, requestedFields);
    if (status === "VALID") stats.valid += 1;
    else if (status === "INVALID") stats.invalid += 1;
    else stats.partial += 1;
    return { ...item, status, errors };
  });
  await logStep(task.id, "VALIDATION", "COMPLETED", `${stats.valid} valid, ${stats.partial} partial, ${stats.invalid} invalid`);

  // --- Storage --- (invalid records are not persisted; bulk-inserted with
  // createMany rather than one INSERT per record, to avoid N+1 writes)
  const toInsert = validated
    .filter((item) => item.status !== "INVALID")
    .map((item) => ({
      datasetId: dataset.id,
      sourceId: item.source.id,
      data: item.normalized,
      validationStatus: item.status,
      validationErrors: item.errors.length ? item.errors : undefined,
      dedupeKey: item.dedupeKey,
    }));

  if (toInsert.length > 0) {
    await prisma.record.createMany({ data: toInsert });
  }
  stats.final = toInsert.length;
  await logStep(task.id, "STORAGE", "COMPLETED", `${stats.final} records stored`);

  await logStep(task.id, "PIPELINE", "COMPLETED", "Pipeline finished", stats);
  return { dataset, stats };
}
