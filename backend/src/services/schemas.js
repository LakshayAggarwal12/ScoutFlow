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

export const ExtractedRecordSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null(), z.undefined()]).optional()).transform((data) => {
  // Normalize: convert all values to strings or null; filter out undefined
  const result = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) result[k] = null;
    else result[k] = String(v).trim() || null;
  }
  return result;
});
