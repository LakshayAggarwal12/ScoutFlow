import dotenv from "dotenv";
dotenv.config();

const bool = (value, fallback) =>
  value === undefined || value === "" ? fallback : String(value).toLowerCase() === "true";

export const env = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
  nodeEnv: process.env.NODE_ENV || "development",
  demoMode: bool(process.env.DEMO_MODE, false),
  // When false, a run that collects zero real sources FAILS loudly instead of
  // silently serving demo data (which previously masked missing API keys).
  allowDemoFallback: bool(process.env.ALLOW_DEMO_FALLBACK, true),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  workerMode: process.env.WORKER_MODE || "in-process",
  taskConcurrency: parseInt(process.env.TASK_CONCURRENCY || "3", 10),
  taskMaxAttempts: parseInt(process.env.TASK_MAX_ATTEMPTS || "2", 10),
  // Bounded worker pools: page fetches and LLM extractions run in parallel,
  // but never unbounded.
  fetchConcurrency: parseInt(process.env.FETCH_CONCURRENCY || "4", 10),
  extractionConcurrency: parseInt(process.env.EXTRACTION_CONCURRENCY || "2", 10),
  // Serper budget: each (query x page) pair costs one paid query.
  // FAST prototype profile: 2 queries x 1 page ≈ 10-14 sources, ~3-6 min runs
  // on the Groq free tier (8000 TPM). Raise for deeper production runs.
  searchMaxQueries: parseInt(process.env.SEARCH_MAX_QUERIES || "2", 10),
  searchPagesPerQuery: parseInt(process.env.SEARCH_PAGES_PER_QUERY || "1", 10),
  // Hard ceiling on collected sources per task, regardless of requested limit.
  // 0/empty = no cap. Prototype fast default 12: a dozen listicles still
  // yield 50+ records (one page → many records).
  maxSources: parseInt(process.env.MAX_SOURCES || "12", 10),
  // Stop extracting new pages once this many candidate records exist (0 = off).
  // Fast default 60 covers a 50-record ask without paying for all pages.
  extractionEarlyStop: parseInt(process.env.EXTRACTION_EARLY_STOP || "60", 10),
  allowedOrigin: process.env.ALLOWED_ORIGIN || "",
  adminToken: process.env.ADMIN_TOKEN || "scoutflow-secret-token",
  jwtSecret: process.env.JWT_SECRET || "scoutflow-dev-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  serperApiKey: process.env.SERPER_API_KEY || "",
};

// Fail fast on production misconfiguration instead of running with a
// well-known default signing secret.
if (env.nodeEnv === "production" && env.jwtSecret === "scoutflow-dev-secret-change-in-production") {
  throw new Error("JWT_SECRET must be set to a custom value when NODE_ENV=production");
}
