import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getRecords, getDatasetVersions, exportCsvUrl, exportJsonUrl } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import MockDataBadge from "../components/MockDataBadge.jsx";
import { SkeletonTable } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";

const PAGE_SIZE = 10;

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

  return (
    <div className="p-8 animate-fade-in">
      <Link to={`/tasks/${id}`} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-150">
        ← Back to task
      </Link>
      <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Dataset Explorer</h1>
          {data?.usedMockData && <MockDataBadge />}
        </div>
        <div className="flex items-center gap-2">
          {versions.length > 1 && (
            <select
              className="input max-w-[140px]"
              value={version ?? ""}
              onChange={(e) => {
                setPage(1);
                setVersion(e.target.value ? parseInt(e.target.value, 10) : undefined);
              }}
            >
              <option value="">Latest (v{versions[0]?.version})</option>
              {versions.map((v) => (
                <option key={v.id} value={v.version}>
                  v{v.version} ({v._count.records} records)
                </option>
              ))}
            </select>
          )}
          <a href={exportCsvUrl(id)} className="btn-secondary" download>
            Export CSV
          </a>
          <a href={exportJsonUrl(id)} className="btn-primary" download>
            Export JSON
          </a>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search company or role..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <input
          className="input max-w-xs"
          placeholder="Filter by location..."
          value={location}
          onChange={(e) => {
            setPage(1);
            setLocation(e.target.value);
          }}
        />
        <select
          className="input max-w-[160px]"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="VALID">Valid</option>
          <option value="PARTIAL">Partial</option>
          <option value="INVALID">Invalid</option>
        </select>
        <select className="input max-w-[160px]" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      <div className="mt-5">
        {loading && <SkeletonTable rows={PAGE_SIZE} cols={6} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState
            title="No records match these filters"
            description="Try clearing the search, location, or status filters."
          />
        )}
        {!loading && !error && data && data.items.length > 0 && (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400">
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-2.5 font-medium capitalize">
                        {col.replace(/_/g, " ")}
                      </th>
                    ))}
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-0 row-hover cursor-pointer"
                      onClick={() => setSelected(record)}
                    >
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-2.5 whitespace-nowrap max-w-[220px] truncate">
                          {record.data[col] ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                      ))}
                      <td className="px-4 py-2.5">
                        <StatusBadge status={record.validationStatus} />
                      </td>
                      <td className="px-4 py-2.5">
                        {record.source?.url && (
                          <a
                            href={record.source.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-accent hover:underline"
                          >
                            View Source
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>
                {data.total} record{data.total !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary px-3 py-1.5"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn-secondary px-3 py-1.5"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-end z-20 animate-fade-in"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 h-full w-full max-w-md shadow-xl p-6 overflow-y-auto animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Record Details</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors duration-150">
                ✕
              </button>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              {Object.entries(selected.data).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs text-slate-500 dark:text-slate-400 capitalize">{key.replace(/_/g, " ")}</dt>
                  <dd className="mt-0.5">{value ?? <span className="text-slate-300 dark:text-slate-600">—</span>}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Validation</dt>
                <dd className="mt-1"><StatusBadge status={selected.validationStatus} /></dd>
              </div>
              {selected.validationErrors && (
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Validation notes</dt>
                  <dd className="mt-0.5 text-amber-700 dark:text-amber-400 text-xs space-y-0.5">
                    {selected.validationErrors.map((e, i) => <p key={i}>{e}</p>)}
                  </dd>
                </div>
              )}
              {selected.source?.url && (
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Source</dt>
                  <dd className="mt-0.5">
                    <a href={selected.source.url} target="_blank" rel="noreferrer" className="text-accent hover:underline break-all">
                      {selected.source.url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
