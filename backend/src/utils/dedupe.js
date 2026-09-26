// Deterministic, explainable deduplication signals — no fuzzy ML matching
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
  const url = data.application_url ? slug(data.application_url) : "";
  if (url) return `url:${url}`;

  const company = slug(data.company_name);
  const role = stemRoleTokens(data.role);
  const location = slug(data.location);
  return `crl:${company}:${role}:${location}`;
}
