import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listSources } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { SkeletonTable } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";

const PAGE_SIZE = 15;

export default function Sources() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    listSources({ page, limit: PAGE_SIZE, status: status || undefined })
      .then(setData)
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, status]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <h1 className="text-xl font-semibold">Sources</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Provenance and collection health for every source across all tasks.
      </p>

      <div className="mt-5 flex gap-3">
        <select
          className="input max-w-[180px]"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="COLLECTED">Collected</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      <div className="mt-5">
        {loading && <SkeletonTable rows={8} cols={4} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState title="No sources yet" description="Sources appear here once a task starts collecting." />
        )}
        {!loading && !error && data && data.items.length > 0 && (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-2.5 font-medium">URL</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Collected</th>
                    <th className="px-4 py-2.5 font-medium">Task</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 row-hover">
                      <td className="px-4 py-2.5 max-w-xs truncate">
                        <a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                          {s.url}
                        </a>
                        {s.errorMessage && (
                          <p className="text-xs text-red-500 mt-0.5 truncate">{s.errorMessage}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{s.type}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link to={`/tasks/${s.taskId}`} className="text-accent hover:underline text-xs">
                          View task
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>{data.total} source{data.total !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2">
                <button className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </button>
                <span>Page {page} of {totalPages}</span>
                <button className="btn-secondary px-3 py-1.5" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
