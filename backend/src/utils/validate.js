// Schema/rule-based validation of an extracted record against the task's requested fields.

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isValidIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(value).getTime());
}

export function validateRecord(data, requestedFields = []) {
  const errors = [];
  const requiredAlways = ["company_name", "role"];

  for (const field of requiredAlways) {
    if (!data[field]) errors.push(`${field} is required but missing`);
  }

  if (requestedFields.includes("location") && !data.location) {
    errors.push("location was requested but could not be extracted");
  }
  if (requestedFields.includes("application_url")) {
    if (!data.application_url) errors.push("application_url was requested but could not be extracted");
    else if (!isValidUrl(data.application_url)) errors.push("application_url is not a valid URL");
  }
  if (requestedFields.includes("posting_date")) {
    if (!data.posting_date) errors.push("posting_date could not be extracted");
    else if (!isValidIsoDate(data.posting_date)) errors.push("posting_date is not a recognizable date");
  }
  if (requestedFields.includes("salary") && !data.salary) {
    errors.push("salary could not be extracted");
  }

  let status = "VALID";
  if (errors.some((e) => e.includes("is required but missing") || e.includes("not a valid URL"))) {
    status = "INVALID";
  } else if (errors.length > 0) {
    status = "PARTIAL";
  }

  return { status, errors };
}
