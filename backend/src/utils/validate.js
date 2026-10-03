// Generic, field-aware validation of an extracted record.
// Works for ANY entity type (jobs, startups, research, leads, products).
// Validation is now based on the *requested fields*, not a hardcoded job schema.

function isValidUrl(value) {
  try { new URL(value); return true; } catch { return false; }
}

function isValidIsoDateLike(value) {
  // Accept ISO dates AND common text dates ("2024-01-15", "January 2024", etc.)
  if (!value || typeof value !== "string") return false;
  const str = value.trim();
  return str.length >= 4 && !isNaN(Date.parse(str));
}

export function validateRecord(data, requestedFields = []) {
  const errors = [];

  for (const field of requestedFields) {
    const value = data[field];
    const missing = value === null || value === undefined || value === "";

    // URL fields — only error when a value IS present but malformed.
    // A missing URL (null / empty) is NOT an error: the apply link is often
    // behind a login wall and simply doesn't exist on the scraped page.
    if (field.endsWith("_url") || field === "url" || field === "website" || field === "link") {
      if (!missing && !isValidUrl(value)) {
        errors.push(`${field} is not a valid URL`);
      }
      continue;
    }

    // Date fields — validate if present, flag if missing  
    if (field.endsWith("_date") || field === "date" || field === "published" || field === "posted") {
      if (missing) {
        errors.push(`${field} could not be extracted`);
      } else if (!isValidIsoDateLike(value)) {
        errors.push(`${field} is not a recognizable date`);
      }
      continue;
    }

    // Generic fields — just flag if missing
    if (missing) {
      errors.push(`${field} could not be extracted`);
    }
  }

  // Scoring:
  //   INVALID  — any URL is present-but-malformed, OR >50% of fields are missing
  //   PARTIAL  — some fields missing but fill rate is between 30% and 100%
  //              (previously ANY single missing field → PARTIAL; now threshold
  //               is 70% fill rate so a 4/5-field record counts as VALID)
  //   VALID    — no errors, OR fill rate >= 70% with no malformed URLs
  const urlFormatErrors = errors.filter((e) => e.includes("not a valid URL")).length;
  const missingCount = errors.filter((e) => e.includes("could not be extracted")).length;
  const totalRequested = requestedFields.length || 1;
  const fillRate = (totalRequested - missingCount) / totalRequested;

  let status = "VALID";
  if (urlFormatErrors > 0 || missingCount / totalRequested > 0.5) {
    status = "INVALID";
  } else if (fillRate < 0.7) {
    // Less than 70% of fields filled → PARTIAL
    status = "PARTIAL";
  }

  return { status, errors };
}

