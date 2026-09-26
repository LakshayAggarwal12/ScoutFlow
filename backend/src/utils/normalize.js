// Deterministic, rule-based normalization. No LLM calls belong here.

const LOCATION_ALIASES = {
  bengaluru: "Bengaluru, Karnataka",
  bangalore: "Bengaluru, Karnataka",
  "bengaluru, karnataka": "Bengaluru, Karnataka",
  hyderabad: "Hyderabad, Telangana",
  gurugram: "Gurugram, Haryana",
  gurgaon: "Gurugram, Haryana",
  delhi: "Delhi, NCR",
  "new delhi": "Delhi, NCR",
  noida: "Noida, Uttar Pradesh",
  pune: "Pune, Maharashtra",
  mumbai: "Mumbai, Maharashtra",
  chennai: "Chennai, Tamil Nadu",
  remote: "Remote",
};

export function normalizeLocation(raw) {
  if (!raw) return null;
  const cleaned = String(raw).trim().replace(/\s+/g, " ");
  const key = cleaned.toLowerCase();
  return LOCATION_ALIASES[key] || cleaned;
}

export function normalizeWhitespace(raw) {
  if (raw === null || raw === undefined) return raw;
  return String(raw).trim().replace(/\s+/g, " ");
}

export function normalizeUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(String(raw).trim());
    u.hash = "";
    // Strip common tracking params so identical postings dedupe cleanly.
    const dropParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source"];
    dropParams.forEach((p) => u.searchParams.delete(p));
    let normalized = u.toString();
    if (normalized.endsWith("/") && u.pathname !== "/") {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return String(raw).trim();
  }
}

// Accepts "2 days ago", "Posted today", "2026-09-20", "20 Sep 2026" and
// returns an ISO date string (yyyy-mm-dd) when it can, else null.
export function normalizeDate(raw, referenceDate = new Date()) {
  if (!raw) return null;
  const text = String(raw).trim().toLowerCase();

  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];

  if (text.includes("today")) {
    return toIso(referenceDate);
  }
  if (text.includes("yesterday")) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 1);
    return toIso(d);
  }

  const relMatch = text.match(/(\d+)\s*(day|days|hour|hours|week|weeks)\s*ago/);
  if (relMatch) {
    const amount = parseInt(relMatch[1], 10);
    const unit = relMatch[2];
    const d = new Date(referenceDate);
    if (unit.startsWith("day")) d.setDate(d.getDate() - amount);
    else if (unit.startsWith("hour")) d.setHours(d.getHours() - amount);
    else if (unit.startsWith("week")) d.setDate(d.getDate() - amount * 7);
    return toIso(d);
  }

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) return toIso(parsed);

  return null;
}

function toIso(d) {
  return d.toISOString().slice(0, 10);
}

export function normalizeSalary(raw) {
  if (!raw) return null;
  return String(raw).trim().replace(/\s+/g, " ");
}

export function normalizeRecordFields(data, referenceDate) {
  const out = { ...data };
  if ("location" in out) out.location = normalizeLocation(out.location);
  if ("application_url" in out) out.application_url = normalizeUrl(out.application_url);
  if ("posting_date" in out) out.posting_date = normalizeDate(out.posting_date, referenceDate);
  if ("salary" in out) out.salary = normalizeSalary(out.salary);
  if ("company_name" in out) out.company_name = normalizeWhitespace(out.company_name);
  if ("role" in out) out.role = normalizeWhitespace(out.role);
  return out;
}
