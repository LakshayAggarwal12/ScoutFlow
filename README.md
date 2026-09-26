# AI-Powered Data Intelligence Platform — MVP

Turns a natural-language data request into a structured, source-backed dataset,
running as a real background job with retries, cancellation, and provenance:

```
"Find 50 AI internships in India posted in the last 7 days.
 Return company, role, location, salary, posting date and application URL."
        ↓
React frontend → Node/Express API → BullMQ/Redis queue → background worker
        ↓
Python/FastAPI AI service (parse requirement → plan workflow)
        ↓
Multi-source collection (real public API + configurable search provider,
with automatic, clearly-labeled fallback to demo data) → extract → normalize
→ deduplicate → validate → store
        ↓
PostgreSQL (via Prisma) → React dashboard (search / filter / sort / paginate /
export CSV+JSON / provenance / dataset versions / source health)
```

This is a **functional MVP**, upgraded incrementally from an earlier working
prototype (see §1 for exactly what carried over vs. what's new).

---

## 1. What was already implemented (carried over, not rebuilt)

- The overall three-service architecture (React / Node+Express+Prisma /
  Python+FastAPI) and the "AI never touches the DB or runs code" boundary
  (Zod on the Node side, Pydantic on the Python side).
- The full Prisma schema (`Task`, `Workflow`, `Source`, `Dataset`, `Record`,
  `ExecutionLog`) and its indexes.
- Deterministic utilities: `normalize.js`, `dedupe.js`, `validate.js` — location
  aliasing, date parsing, URL canonicalization, an explainable dedup key, and
  rule-based record validation.
- The demo collector and its seeded, intentionally-duplicated job listings.
- The AI service's three endpoints (`parse-requirement`, `plan-workflow`,
  `extract`), each with an LLM path and a deterministic rule-based fallback.
- The original six frontend pages (Dashboard, Create Task, Task Detail,
  Workflow, Dataset Explorer, History) and CSV export.

## 2. What changed / new in this upgrade

### Backend — reliability & real collection
- **Background jobs via BullMQ + Redis** (`backend/src/queue/`). Task creation
  and reruns now enqueue a job instead of firing an async function inline;
  a worker (`taskWorker.js`) processes it, with configurable concurrency,
  retries, and exponential backoff (`TASK_CONCURRENCY`, `TASK_MAX_ATTEMPTS`).
  The worker runs in-process by default (`npm run dev` just works) or as its
  own process (`npm run worker`, `WORKER_MODE=separate`) for real horizontal
  scaling.
- **Real, permitted, multi-source collection**: a new `remotiveCollector.js`
  calls Remotive's public, no-API-key jobs API as a genuine live data source
  alongside the existing generic HTTP/search collector. If **no** real
  collector returns usable results (no provider configured, provider down,
  network unavailable), the system automatically falls back to the seeded
  demo data and **labels the resulting dataset `usedMockData: true`** so the
  UI can show it honestly (a "Mock data" badge) rather than pretending it's
  live.
- **SSRF protection** (`utils/urlSafety.js`): every outbound collector fetch is
  validated before the request — protocol restricted to http/https, hostname
  resolved and checked against private/loopback/link-local/cloud-metadata IP
  ranges, and redirects are re-validated hop-by-hop rather than trusted blindly.
- **Cooperative task cancellation**: cancelling sets a `cancelRequested` flag;
  a queued-but-not-started job is removed immediately, and a running job checks
  the flag at each of the four major pipeline checkpoints and stops cleanly
  (`CANCELLED`) rather than being killed mid-write.
- **Retry semantics split in two**: BullMQ retries transient failures
  automatically (task status is only set `FAILED` on the job's *final*
  attempt — earlier attempts log `RETRY_SCHEDULED` and requeue); a `FAILED`
  or `COMPLETED` task can also be explicitly re-run from the UI, which
  increments `Task.retryCount` and creates a new dataset version.
- **Source health tracking**: every collection attempt — including failed
  ones — writes a `Source` row (`status`, `errorMessage`, `checkedAt`), so
  failures are visible, not silently dropped. New `GET /api/sources/health/:taskId`
  returns a per-status count summary.
- **Basic dataset versioning**: each run/rerun of a task creates a new
  `Dataset` row (`version` auto-incremented) instead of overwriting the
  previous results; old versions stay queryable (`?version=N`) via
  `GET /api/tasks/:id/dataset/versions`.
- **JSON export** alongside the existing CSV export
  (`GET /api/tasks/:id/export/json`).
- **Bulk inserts**: the storage stage now uses `record.createMany` instead of
  one `INSERT` per record, avoiding N+1 writes on larger result sets.
- **A real, pre-existing bug fixed**: the Zod schema for `date_range.days`
  used `.optional()`, which rejects the explicit `null` the AI service sends
  when a prompt has no date window (e.g. "Find AI internships in India" with
  no "last N days") — this made every such prompt fail validation. Fixed with
  `.nullable().optional()`. Found by testing a prompt shape the original demo
  script never exercised.

### AI service
No functional changes were needed here — it already kept the three
responsibilities (parse / plan / extract) narrowly scoped, with deterministic
fallbacks, per this upgrade's own instructions. Verified still correct against
the new backend.

### Frontend — SaaS-grade UX
- **New Sources page** — provenance/health across all tasks, filterable by
  status, with per-row error messages for failed collections.
- **Toast notifications** (`context/ToastContext.jsx`) for task creation,
  retry, and cancellation actions.
- **Dark mode** (`context/ThemeContext.jsx`, Tailwind `darkMode: "class"`),
  toggled from the sidebar, persisted in `localStorage`, respecting system
  preference on first load.
- **Loading skeletons** (`components/Skeleton.jsx`) for every page's initial
  load, replacing blank "Loading..." text.
- **Empty and error states** (`components/EmptyState.jsx`, `ErrorState.jsx`)
  with retry affordances, used consistently across Dashboard, History,
  Sources, and Dataset.
- **Micro-interactions**: 150–220ms transitions on buttons, cards, table rows,
  and the record-detail drawer (slide-in); a pulsing active-step indicator on
  the workflow diagram and the pipeline checklist; button loading spinners.
- **Retry / Rerun / Cancel wired to the real endpoints** on Task Detail, with
  toast feedback and disabled states while in flight.
- **Mock-data badge** on Task Detail and Dataset Explorer whenever a dataset
  was produced via the demo fallback rather than a real collector.
- **Dataset version selector** and a **JSON export** button alongside CSV.
- **Status filters** added to History (by task status) and Dataset Explorer
  (by validation status).

## 3. Database / schema changes

Additive migration: `backend/prisma/migrations/20260925000000_mvp_upgrade/migration.sql`

| Model | New columns | Why |
|---|---|---|
| `Task` | `jobId`, `retryCount`, `cancelRequested` | Track the BullMQ job, count reruns, support cooperative cancellation |
| `Source` | `errorMessage`, `checkedAt` (+ index on `status`) | Source health/provenance |
| `Dataset` | `version`, `usedMockData` | Basic versioning + honest mock-data labeling |

No existing columns were removed or renamed — this is a purely additive change.

---

## 4. How to run the system

Requires Node 18+, Python 3.10+, PostgreSQL 14+, and **Redis** (new requirement
in this upgrade) running locally.

```bash
# 1. Database
createdb ai_data_intel   # or update DATABASE_URL in backend/.env

# 2. Redis
redis-server &           # or: apt/brew install redis, then start the service

# 3. AI service
cd ai-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 4. Backend (new terminal) — runs the API AND the background worker together
cd backend
npm install
npx prisma generate
npx prisma migrate dev     # applies both migrations in prisma/migrations/
npm run dev                # http://localhost:5000

# 5. Frontend (new terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173
```

To run the worker as its own process instead (recommended once you need the
API and the workers to scale independently): set `WORKER_MODE=separate` in
`backend/.env`, then run `npm run worker` in a separate terminal alongside
`npm run dev`.

Open `http://localhost:5173` → **Create Task** → try the example prompts
provided in the form. You'll see the task move through
`QUEUED → PLANNING → RUNNING → COMPLETED` (a real BullMQ job, not a fire-and-
forget promise), with a live pipeline checklist, source health, and — once
complete — a searchable/filterable/exportable dataset with per-record
provenance. Try **Cancel** on a task right after creating it, and **Rerun** on
a completed one to see dataset versioning in action.

### A note on this sandbox vs. your machine

Two things that need real internet access couldn't be fully exercised inside
the sandboxed environment this was built in, and are worth knowing about:

1. **`npx prisma generate`** downloads its query-engine binary from
   `binaries.prisma.sh`, which the sandbox's network allowlist didn't include.
   All business logic was instead validated end-to-end against a real local
   PostgreSQL instance using a temporary raw-SQL stand-in for the Prisma
   Client (restored to the genuine client before delivery). This works
   normally on any machine with standard internet access.
2. **The Remotive real-collector path** was exercised and correctly returned
   an HTTP 403 in the sandbox (the outbound domain wasn't reachable) —
   confirming the code path runs, the error is caught, it's logged per the
   spec's "source health" requirement, and the system falls back to demo data
   and labels it as mock, exactly as designed. On a machine with normal
   internet access this collector will return live job listings instead.

Everything else — the BullMQ/Redis queue, task cancellation (for a queued
job), task rerun and dataset versioning, retry-on-failure via BullMQ,
JSON export, source health tracking, and SSRF protection — was run and
verified live in this environment.

---

## 5. Environment variables

**backend/.env**
```
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/ai_data_intel
AI_SERVICE_URL=http://localhost:8000
NODE_ENV=development
DEMO_MODE=true

REDIS_URL=redis://localhost:6379
WORKER_MODE=in-process        # or "separate" + `npm run worker`
TASK_CONCURRENCY=3
TASK_MAX_ATTEMPTS=2

# Optional: a configured search/jobs API for the generic collector
SEARCH_PROVIDER=
SEARCH_API_KEY=
```

**ai-service/.env**
```
PORT=8000
LLM_API_KEY=            # optional — leave blank to use the rule-based fallback
LLM_MODEL=claude-sonnet-4-6
```

**frontend/.env**
```
VITE_API_URL=http://localhost:5000/api
```

---

## 6. API reference

| Method | Path | Notes |
|---|---|---|
| POST | `/api/tasks` | Create a task and enqueue it (BullMQ) |
| GET | `/api/tasks` | List tasks (`?page&limit&status`) |
| GET | `/api/tasks/:id` | Task detail (now includes `jobId`, `retryCount`, `cancelRequested`) |
| POST | `/api/tasks/:id/run` | Rerun/retry a task (new dataset version) |
| POST | `/api/tasks/:id/cancel` | Request cancellation (immediate if still queued, cooperative if running) |
| GET | `/api/tasks/:id/workflow` | Latest workflow plan + status |
| GET | `/api/tasks/:id/logs` | Execution log |
| GET | `/api/tasks/:id/dataset` | Latest dataset by default; `?version=N` for a specific one |
| GET | `/api/tasks/:id/dataset/versions` | All dataset versions for a task, with record counts |
| GET | `/api/tasks/:id/records` | `?page&limit&search&location&status&sort&version` |
| GET | `/api/tasks/:id/export/csv` | CSV download |
| GET | `/api/tasks/:id/export/json` | **New** — JSON download |
| GET | `/api/sources` | `?taskId&status&page&limit` |
| GET | `/api/sources/health/:taskId` | **New** — per-status counts for one task |
| GET | `/api/sources/:id` | Single source |
| GET | `/api/stats` | Dashboard counters + recent tasks |
| GET | `/api/health` | Backend health check |

---

## 7. Remaining limitations

- **No authentication** — the `User` model exists but isn't wired to real login.
- **Only one real collector integration** (Remotive's public jobs API) plus
  the generic HTTP/search-provider interface — no site-specific scrapers.
  Adding one is a matter of implementing the same `{ sourceUrl, sourceType,
  rawContent }` shape in `backend/src/collectors/` and wiring it into
  `collectionService.js`.
- **Dedup is still exact-key-based**, not fuzzy/similarity-based — a
  reasonable next step if near-duplicate titles need to collapse without a
  shared URL or identical wording.
- **Dataset versions are independent snapshots**, not diffed against each
  other (no "what changed between v1 and v2" view yet).
- **Redis/BullMQ is a single local instance** in this setup — production use
  would want a managed Redis with persistence and monitoring (e.g. Bull Board)
  for job visibility.
- **SSRF protection covers IP-literal and DNS-resolved private ranges**, but
  does not defend against DNS-rebinding attacks that change the resolved IP
  between the check and the actual request (a real hardening would pin the
  resolved IP for the request itself, e.g. via a custom DNS resolver/agent).
