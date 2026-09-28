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
  return String(raw).trim().replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ");
}

export function normalizeUrl(raw) {
  if (raw === null || raw === undefined) return null;
  let value = String(raw).trim();
  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) {
    // Bare domain ("6sense.com", "www.example.com/path") → assume https so
    // valid websites aren't marked INVALID for missing a scheme.
    if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(value)) {
      value = `https://${value}`;
    } else {
      // "N/A", "link in bio", "see website" → treat as missing, not as a URL.
      return null;
    }
  }

  try {
    const u = new URL(value);
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
    return null;
  }
}

// Country/region → known localities, so a requirement like "India" matches
// "Bengaluru, Karnataka" (which never contains the word "India").
const REGION_LOCALITIES = {
  india: [
    "india", "bengaluru", "bangalore", "hyderabad", "pune", "mumbai", "delhi",
    "noida", "gurugram", "gurgaon", "chennai", "kolkata", "ahmedabad", "jaipur",
    "kochi", "indore", "surat", "chandigarh", "lucknow", "coimbatore",
    "thiruvananthapuram", "mysuru", "mysore", "mangaluru", "mangalore", "udaipur",
  ],
  "united states": [
    "united states", "usa", "u.s.a", "san francisco", "new york", "los angeles",
    "seattle", "austin", "boston", "denver", "chicago", "palo alto",
    "mountain view", "san mateo", "san jose", "cambridge", "atlanta", "miami",
    "dallas", "houston", "nyc", "sf bay",
  ],
  "united kingdom": ["united kingdom", "uk", "u.k", "london", "manchester", "edinburgh", "bristol", "cambridge uk"],
  singapore: ["singapore"],
  canada: ["canada", "toronto", "vancouver", "montreal", "ottawa"],
  australia: ["australia", "sydney", "melbourne", "brisbane", "perth"],
  uae: ["uae", "united arab emirates", "dubai", "abu dhabi"],
  germany: ["germany", "berlin", "munich", "hamburg", "frankfurt"],
};

// Does a record's location satisfy the requirement's location constraint?
// - unknown record location → keep (validation already flags it as missing)
// - "Remote" → keep (ambiguous, could be anywhere)
// - known region requirement → match against its known localities
// - otherwise → plain substring match in both directions
export function locationMatchesRequirement(recordLocation, requirementLocation) {
  if (!requirementLocation) return true;
  if (!recordLocation) return true;

  const loc = String(recordLocation).toLowerCase().trim();
  const req = String(requirementLocation).toLowerCase().trim();
  if (loc === "remote") return true;
  if (loc.includes(req) || req.includes(loc)) return true;

  const localities = REGION_LOCALITIES[req];
  if (localities) return localities.some((t) => loc.includes(t));
  return false;
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
  if ("website" in out) out.website = normalizeUrl(out.website);
  if ("posting_date" in out) out.posting_date = normalizeDate(out.posting_date, referenceDate);
  if ("salary" in out) out.salary = normalizeSalary(out.salary);
  if ("company_name" in out) out.company_name = normalizeWhitespace(out.company_name);
  if ("role" in out) out.role = normalizeWhitespace(out.role);
  // Multi-valued fields arrive as arrays/objects from the LLM and are
  // coerced to strings upstream; tidy the separators here.
  if ("founders" in out) out.founders = normalizeWhitespace(out.founders);
  if ("funding" in out) out.funding = normalizeWhitespace(out.funding);
  return out;
}
