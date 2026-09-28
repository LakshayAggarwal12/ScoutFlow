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

    // URL fields — validate format if present, flag if missing
    if (field.endsWith("_url") || field === "url" || field === "website" || field === "link") {
      if (missing) {
        errors.push(`${field} was requested but could not be extracted`);
      } else if (!isValidUrl(value)) {
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

  // Scoring: critical = URL format errors or >50% of fields missing
  const urlFormatErrors = errors.filter((e) => e.includes("not a valid URL")).length;
  const missingCount = errors.filter((e) => e.includes("could not be extracted") || e.includes("but missing")).length;
  const totalRequested = requestedFields.length || 1;

  let status = "VALID";
  if (urlFormatErrors > 0 || missingCount / totalRequested > 0.5) {
    status = "INVALID";
  } else if (errors.length > 0) {
    status = "PARTIAL";
  }

  return { status, errors };
}

