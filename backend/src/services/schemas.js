import { z } from "zod";

// Mirrors the Pydantic models on the Python side. The Node backend never
// trusts AI output blindly - every response is re-validated here before
// it is persisted or used to drive execution.

export const StructuredRequirementSchema = z.object({
  entity: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  location: z.string().nullable().optional(),
  date_range: z
    .object({
      type: z.enum(["relative", "absolute", "any"]),
      days: z.number().int().positive().nullable().optional(),
    })
    .nullable()
    .optional(),
  limit: z.number().int().positive().max(200).default(50),
  fields: z.array(z.string()).min(1),
});

const ALLOWED_STEP_TYPES = ["search", "collect", "extract", "normalize", "filter", "validate", "deduplicate", "store"];

export const WorkflowStepSchema = z.object({
  type: z.enum(ALLOWED_STEP_TYPES),
  purpose: z.string().nullable().optional(),
  fields: z.array(z.string()).nullable().optional(),
});

export const WorkflowPlanSchema = z.object({
  steps: z.array(WorkflowStepSchema).min(1),
});

// Coerce any JSON value to a displayable string (or null). Arrays and
// objects are flattened rather than rejected: the old schema required
// string|number|null, so a list like `founders: ["A", "B"]` failed zod
// validation and the whole record silently collapsed to `{}`.
function humanizeKey(key) {
  return String(key).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function coerceScalar(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value).trim() || null;
  }
  if (Array.isArray(value)) {
    const parts = value.map(coerceScalar).filter((v) => v !== null);
    return parts.length ? parts.join(", ") : null;
  }
  if (typeof value === "object") {
    const parts = Object.entries(value)
      .map(([k, v]) => {
        const scalar = coerceScalar(v);
        return scalar ? `${humanizeKey(k)}: ${scalar}` : null;
      })
      .filter(Boolean);
    return parts.length ? parts.join("; ") : null;
  }
  return String(value).trim() || null;
}

export const ExtractedRecordSchema = z.record(z.string(), z.unknown()).transform((data) => {
  const result = {};
  for (const [k, v] of Object.entries(data)) {
    result[k] = coerceScalar(v);
  }
  return result;
});

// Extraction now returns ONE record per entity found on a page, so the AI
// response is a JSON array. A single object (legacy / single-entity pages)
// is accepted and wrapped; non-object elements (stray prose in the array)
// are dropped rather than failing the whole parse.
export const ExtractedRecordsSchema = z.preprocess(
  (value) => {
    const arr = Array.isArray(value)
      ? value
      : value && typeof value === "object"
        ? [value]
        : [];
    return arr.filter((el) => el && typeof el === "object" && !Array.isArray(el));
  },
  z.array(ExtractedRecordSchema)
);
