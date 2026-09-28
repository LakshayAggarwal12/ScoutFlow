// Deterministic, explainable deduplication signals - no fuzzy ML matching
// for the prototype, per spec ("do not over-engineer this initially").

function slug(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

// Collapse common role-title variants ("Software Engineer Intern" vs
// "Software Engineering Intern") onto the same key by stemming a few
// frequent suffixes. Simple and understandable, not a general NLP solution.
function stemRoleTokens(text) {
  return slug(text)
    .split("-")
    .map((t) => t.replace(/(ing)$/, "").replace(/(eer)$/, "e"))
    .join("-");
}

export function buildDedupeKey(data) {
  const url = data.application_url || data.website || data.url;
  if (url) return `url:${slug(url)}`;

  const company = slug(data.company_name || data.startup_name || data.name || data.organization);
  const role = stemRoleTokens(data.role || data.title);
  const location = slug(data.location);

  // A record with NO identifying field at all (company/role/location/url all
  // empty) must not produce a shared key like "crl:::" - previously every
  // empty record collided with every other empty record and was silently
  // dropped as a "duplicate". null = don't dedupe this record.
  if (!company && !role && !location) return null;
  return `crl:${company}:${role}:${location}`;
}
