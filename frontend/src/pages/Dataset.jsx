import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getRecords, getDatasetVersions, exportCsvUrl, exportJsonUrl, exportXlsxUrl } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import MockDataBadge from "../components/MockDataBadge.jsx";
import { SkeletonTable } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import SearchInput from "../components/SearchInput.jsx";
import { IconDownload, IconExternal, IconFilter, IconTable, IconX } from "../components/icons.jsx";
import { formatDateTime, formatNumber, hostOf, titleCase } from "../lib/format.js";

const PAGE_SIZE = 10;

// 0-1 confidence score → whole percentage for display.
function confidencePct(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n * 100)));
}

function confidenceTone(pct) {
  if (pct === null) return "bg-slate-300 dark:bg-slate-600";
  if (pct >= 90) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export default function Dataset() {
  const { id } = useParams();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [version, setVersion] = useState(undefined);
  const [versions, setVersions] = useState([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getDatasetVersions(id).then(setVersions).catch(() => {});
  }, [id]);

  // Escape closes the record drawer.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  function load() {
    setLoading(true);
    setError(null);
    getRecords(id, {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      location: location || undefined,
      status: status || undefined,
      sort,
      version,
    })
      .then(setData)
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id, page, search, location, status, sort, version]);

  const columns = data?.items?.[0] ? Object.keys(data.items[0].data) : [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hasFilters = Boolean(search || location || status || sort !== "newest");

  return (
    <div className="page page-full animate-fade-in">
      <PageHeader
        back={{ to: `/tasks/${id}`, label: "Back to task" }}
        eyebrow="Dataset"
        title={
          <span className="flex flex-wrap items-center gap-3">
            Dataset Explorer
            {data?.usedMockData && <MockDataBadge />}
          </span>
        }
        description="Browse, filter and export the validated records collected for this task."
        meta={
          data ? (
            <>
              <span className="tag tabular-nums">v{data.datasetVersion}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {formatNumber(data.total)} {data.total === 1 ? "record" : "records"}
              </span>
            </>
          ) : null
        }
        actions={
          <>
            {versions.length > 1 && (
              <select
                className="select w-auto max-w-[190px]"
                value={version ?? ""}
                onChange={(e) => {
                  setPage(1);
                  setVersion(e.target.value ? parseInt(e.target.value, 10) : undefined);
                }}
                aria-label="Dataset version"
              >
                <option value="">Latest (v{versions[0]?.version})</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.version}>
                    v{v.version} ({v._count.records} records)
                  </option>
                ))}
              </select>
            )}
            <a href={exportCsvUrl(id)} className="btn-secondary btn-sm" download>
              <IconDownload size={15} />
              CSV
            </a>
            <a href={exportJsonUrl(id)} className="btn-secondary btn-sm" download>
              <IconDownload size={15} />
              JSON
            </a>
            <a href={exportXlsxUrl(id)} className="btn-accent btn-sm" download>
              <IconDownload size={15} />
              XLSX
            </a>
          </>
        }
      />

      {/* Filters */}
      <div className="card mt-6 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 sm:flex dark:text-slate-400">
            <IconFilter size={14} />
            Filters
          </span>
          <SearchInput
            className="w-full sm:max-w-xs"
            value={search}
            onChange={(value) => {
              setPage(1);
              setSearch(value);
            }}
            placeholder="Search company, role, title…"
            aria-label="Search records"
          />
          <input
            className="input w-full sm:max-w-[200px]"
            placeholder="Filter by location"
            value={location}
            onChange={(e) => {
              setPage(1);
              setLocation(e.target.value);
            }}
            aria-label="Filter by location"
          />
          <select
            className="select w-auto"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            aria-label="Filter by validation status"
          >
            <option value="">All statuses</option>
            <option value="VALID">Valid</option>
            <option value="PARTIAL">Partial</option>
            <option value="INVALID">Invalid</option>
          </select>
          <select
            className="select w-auto"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort records"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          {hasFilters && (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                setPage(1);
                setSearch("");
                setLocation("");
                setStatus("");
                setSort("newest");
              }}
            >
              <IconX size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        {loading && <SkeletonTable rows={PAGE_SIZE} cols={6} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState
            icon={IconTable}
            title="No records match these filters"
            description="Try clearing the search, location, or status filters."
            action={
              hasFilters ? (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    setPage(1);
                    setSearch("");
                    setLocation("");
                    setStatus("");
                    setSort("newest");
                  }}
                >
                  <IconX size={14} />
                  Clear filters
                </button>
              ) : null
            }
          />
        )}
        {!loading && !error && data && data.items.length > 0 && (
          <>
            <div className="card overflow-hidden">
              <div className="table-scroll scroll-thin">
                <table className="table">
                  <thead>
                    <tr className="thead-row">
                      {columns.map((col) => (
                        <th key={col} className="th">
                          {titleCase(col)}
                        </th>
                      ))}
                      <th className="th">Validation</th>
                      <th className="th">Confidence</th>
                      <th className="th text-right">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((record) => {
                      const pct = confidencePct(record.confidence);
                      return (
                        <tr
                          key={record.id}
                          className="tr cursor-pointer"
                          onClick={() => setSelected(record)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelected(record);
                            }
                          }}
                        >
                          {columns.map((col) => (
                            <td
                              key={col}
                              className="td max-w-[260px] truncate text-slate-700 dark:text-slate-200"
                              title={record.data[col] != null ? String(record.data[col]) : undefined}
                            >
                              {record.data[col] ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                            </td>
                          ))}
                          <td className="td">
                            <StatusBadge status={record.validationStatus} />
                          </td>
                          <td className="td">
                            {pct === null ? (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="meter w-14">
                                  <span className={`meter-fill ${confidenceTone(pct)}`} style={{ width: `${pct}%` }} />
                                </span>
                                <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{pct}%</span>
                              </div>
                            )}
                          </td>
                          <td className="td text-right">
                            {record.source?.url ? (
                              <a
                                href={record.source.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                                title={record.source.url}
                              >
                                {hostOf(record.source.url)}
                                <IconExternal size={12} />
                              </a>
                            ) : (
                              <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination
              className="mt-4"
              page={page}
              totalPages={totalPages}
              total={data.total}
              unit="record"
              onChange={setPage}
              loading={loading}
            />
          </>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-950/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelected(null)}
          role="presentation"
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Record details"
            className="scroll-thin flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-pop animate-slide-in dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
              <div className="min-w-0">
                <p className="eyebrow">Record</p>
                <h2 className="mt-1 text-sm font-semibold text-ink dark:text-white">Record Details</h2>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                  {selected.id.slice(0, 12)}…
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn-icon-sm"
                aria-label="Close record details"
              >
                <IconX size={16} />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selected.validationStatus} />
                {confidencePct(selected.confidence) !== null && (
                  <span className="tag tabular-nums">Confidence {confidencePct(selected.confidence)}%</span>
                )}
                {selected.createdAt && (
                  <span className="tag">Ingested {formatDateTime(selected.createdAt)}</span>
                )}
              </div>

              <dl className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
                {Object.entries(selected.data).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-2.5">
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{titleCase(key)}</dt>
                    <dd className="min-w-0 break-words text-sm text-ink dark:text-slate-100">
                      {value ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </dd>
                  </div>
                ))}
              </dl>

              {selected.validationErrors && selected.validationErrors.length > 0 && (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/20">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Validation notes</p>
                  <ul className="mt-1.5 space-y-1 text-xs text-amber-700 dark:text-amber-400/90">
                    {selected.validationErrors.map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selected.source?.url && (
                <div className="mt-5">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Provenance</p>
                  <a
                    href={selected.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-xs text-accent transition-colors duration-150 hover:border-accent/40 hover:bg-accent/[0.04] dark:border-slate-700"
                  >
                    <IconExternal size={14} className="mt-0.5 shrink-0" />
                    <span className="min-w-0 break-all">{selected.source.url}</span>
                  </a>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
