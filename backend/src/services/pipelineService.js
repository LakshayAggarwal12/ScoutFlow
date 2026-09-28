import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { normalizeRecordFields, locationMatchesRequirement } from "../utils/normalize.js";
import { buildDedupeKey } from "../utils/dedupe.js";
import { validateRecord } from "../utils/validate.js";
import { extractRecords } from "./extractionService.js";
import { logStep } from "./logService.js";
import { mapWithConcurrency } from "../utils/concurrency.js";

// Runs extract -> filter -> normalize -> deduplicate -> validate -> store as
// distinct phases over the whole batch of collected sources (rather than
// interleaved per-record), matching the pipeline stages the frontend
// visualizes, and returns statistics for the task.
//
// Data-integrity rules (the "silent record death" fixes):
// - a source whose extraction fails STILL produces a record, stored as
//   INVALID with the failure reason in validationErrors;
// - INVALID records are persisted (and surfaced by the UI status filter)
//   instead of being dropped before storage;
// - dedupe never collapses records that share an empty key;
// - records violating the requirement's location, or exceeding the requested
//   limit, are dropped with an explicit log + stats entry.
//
// `usedMockData` is stamped onto the Dataset so the UI can honestly label
// demo-mode runs. `version` supports basic dataset versioning: each rerun of
// a task creates a new Dataset row rather than overwriting the previous one.
// `workflowSteps` (the AI-generated plan) contributes its step purposes to
// the execution log so the plan and the actual run visibly line up.
export async function runPipeline(task, sources, { usedMockData = false, workflowSteps = [] } = {}) {
  const requirement = task.structuredRequirement || {};
  const requestedFields = requirement.fields;

  const planNote = (type) => {
    const step = (workflowSteps || []).find((s) => s.type === type);
    return step?.purpose ? ` — ${step.purpose}` : "";
  };

  const previousDataset = await prisma.dataset.findFirst({
    where: { taskId: task.id },
    orderBy: { version: "desc" },
  });
  const version = (previousDataset?.version || 0) + 1;

  const dataset = await prisma.dataset.create({
    data: {
      taskId: task.id,
      name: `${requirement.entity || "task"}-dataset`,
      version,
      usedMockData,
    },
  });

  const stats = {
    discovered: sources.length,
    extracted: 0,
    valid: 0,
    invalid: 0,
    partial: 0,
    duplicates: 0,
    filtered: 0,
    overLimit: 0,
    final: 0,
  };

  // --- Extraction --- (bounded concurrency + early stop; one page can yield MANY records)
  await logStep(task.id, "EXTRACTION", "RUNNING", `Extracting ${sources.length} sources${planNote("extract")}`);
  const extractedItems = [];
  const earlyStopAt = Math.max(0, env.extractionEarlyStop || 0);
  const worker = async ({ source, raw }) => {
    try {
      const records = await extractRecords(raw, requestedFields);
      return { source, records, extractError: null };
    } catch (err) {
      await logStep(task.id, "EXTRACTION", "ERROR", `Source ${source.url} failed: ${err.message}`);
      // Keep the source visible: an all-null record tagged with the error is
      // persisted as INVALID below instead of vanishing.
      return {
        source,
        records: [Object.fromEntries(requestedFields.map((f) => [f, null]))],
        extractError: err.message,
      };
    }
  };
  if (earlyStopAt > 0 && sources.length > env.extractionConcurrency) {
    // Batched so we can stop once enough candidates exist instead of paying
    // LLM tokens for every remaining page.
    const batchSize = Math.max(1, env.extractionConcurrency);
    for (let i = 0; i < sources.length; i += batchSize) {
      const batch = sources.slice(i, i + batchSize);
      const results = await mapWithConcurrency(batch, batchSize, worker);
      for (const result of results) {
        if (result.status === "rejected") {
          await logStep(task.id, "EXTRACTION", "ERROR", `Extraction worker crashed: ${result.reason?.message}`);
          continue;
        }
        const { source, records, extractError } = result.value;
        for (const extracted of records) {
          extractedItems.push({ source, extracted, extractError });
        }
      }
      if (extractedItems.length >= earlyStopAt) {
        await logStep(
          task.id,
          "EXTRACTION",
          "RUNNING",
          `Early stop: ${extractedItems.length} candidates from ${i + batch.length}/${sources.length} sources (EXTRACTION_EARLY_STOP=${earlyStopAt}) — skipping remaining pages`
        );
        break;
      }
    }
  } else {
    const results = await mapWithConcurrency(sources, env.extractionConcurrency, worker);
    for (const result of results) {
      if (result.status === "rejected") {
        await logStep(task.id, "EXTRACTION", "ERROR", `Extraction worker crashed: ${result.reason?.message}`);
        continue;
      }
      const { source, records, extractError } = result.value;
      for (const extracted of records) {
        extractedItems.push({ source, extracted, extractError });
      }
    }
  }
  stats.extracted = extractedItems.length;
  await logStep(
    task.id,
    "EXTRACTION",
    "COMPLETED",
    `${extractedItems.length} records extracted from ${sources.length} sources${planNote("extract")}`
  );

  // --- Normalization ---
  const normalizedItems = extractedItems.map(({ source, extracted, extractError }) => ({
    source,
    extractError,
    normalized: normalizeRecordFields(extracted, new Date()),
  }));
  await logStep(task.id, "NORMALIZATION", "COMPLETED", `${normalizedItems.length} records normalized${planNote("normalize")}`);

  // --- Requirement filter (location) ---
  let filterableItems = normalizedItems;
  if (requirement.location) {
    filterableItems = normalizedItems.filter((item) => {
      const keep = locationMatchesRequirement(item.normalized.location, requirement.location);
      if (!keep) stats.filtered += 1;
      return keep;
    });
    await logStep(
      task.id,
      "FILTER",
      "COMPLETED",
      `Location requirement "${requirement.location}": ${stats.filtered} record(s) filtered out, ${filterableItems.length} kept${planNote("filter")}`
    );
  }

  // --- Deduplication ---
  // Duplicates are merged, not just dropped: the same entity usually appears
  // on several sources, each carrying a different field (one page has the
  // website, another the funding). The first occurrence wins; later ones
  // only fill empty fields, so deduping makes records more complete.
  const keyToIndex = new Map();
  const deduped = [];
  for (const item of filterableItems) {
    const dedupeKey = buildDedupeKey(item.normalized);
    // dedupeKey === null means "nothing identifying" → never dedupe those.
    if (dedupeKey && keyToIndex.has(dedupeKey)) {
      stats.duplicates += 1;
      const existing = deduped[keyToIndex.get(dedupeKey)];
      for (const [field, value] of Object.entries(item.normalized)) {
        if (value === null || value === undefined || value === "") continue;
        const current = existing.normalized[field];
        if (current === null || current === undefined || current === "") {
          existing.normalized[field] = value;
        }
      }
      continue;
    }
    if (dedupeKey) keyToIndex.set(dedupeKey, deduped.length);
    deduped.push({ ...item, dedupeKey, normalized: { ...item.normalized } });
  }
  await logStep(task.id, "DEDUPLICATION", "COMPLETED", `${stats.duplicates} duplicate(s) merged into existing records`, {
    remaining: deduped.length,
  });

  // --- Validation --- (INVALID records are persisted, tagged with their errors)
  const validated = deduped.map((item) => {
    const { status, errors } = validateRecord(item.normalized, requestedFields);
    if (item.extractError) {
      errors.push(`extraction failed: ${item.extractError}`);
      stats.invalid += 1;
      return { ...item, status: "INVALID", errors, confidence: 0.0 };
    }
    if (status === "VALID") stats.valid += 1;
    else if (status === "INVALID") stats.invalid += 1;
    else stats.partial += 1;

    let confidence = 1.0;
    if (status === "INVALID") confidence = 0.0;
    else if (status === "PARTIAL") confidence = Math.max(0.1, 1.0 - errors.length * 0.2);

    return { ...item, status, errors, confidence };
  });
  await logStep(task.id, "VALIDATION", "COMPLETED", `${stats.valid} valid, ${stats.partial} partial, ${stats.invalid} invalid${planNote("validate")}`);

  // --- Limit enforcement ---: a "50 records" request must not silently store
  // 90. Keep the highest-confidence candidates; log what was cut.
  let toInsert = validated.map((item) => ({
    datasetId: dataset.id,
    sourceId: item.source.id,
    data: item.normalized,
    validationStatus: item.status,
    validationErrors: item.errors.length ? item.errors : undefined,
    confidence: item.confidence,
    dedupeKey: item.dedupeKey,
  }));
  if (requirement.limit && toInsert.length > requirement.limit) {
    toInsert.sort((a, b) => b.confidence - a.confidence);
    stats.overLimit = toInsert.length - requirement.limit;
    toInsert = toInsert.slice(0, requirement.limit);
    await logStep(
      task.id,
      "FILTER",
      "COMPLETED",
      `Limit ${requirement.limit} enforced: ${stats.overLimit} extra candidate(s) not stored${planNote("filter")}`
    );
  }

  // --- Storage --- (all statuses persisted - bulk createMany, no N+1 writes)
  if (toInsert.length > 0) {
    await prisma.record.createMany({ data: toInsert });
  }
  stats.final = toInsert.length;
  await logStep(task.id, "STORAGE", "COMPLETED", `${stats.final} records stored (INVALID records included for transparency)`);

  await logStep(task.id, "PIPELINE", "COMPLETED", "Pipeline finished", stats);
  return { dataset, stats };
}
