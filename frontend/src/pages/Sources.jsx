import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listSources } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { statusLabel } from "../lib/status.js";
import { SkeletonTable } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import { IconAlert, IconChevronRight, IconDatabase, IconExternal } from "../components/icons.jsx";
import { formatDateTime, hostOf, pathOf, relativeTime } from "../lib/format.js";

const PAGE_SIZE = 15;
const STATUSES = ["", "COLLECTED", "FAILED", "PENDING"];

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
    <div className="page page-lg animate-fade-in">
      <PageHeader
        eyebrow="Data"
        title="Sources"
        description="Provenance and collection health for every source across all tasks."
        actions={
          !loading && data ? (
            <span className="tag tabular-nums">{data.total} {data.total === 1 ? "source" : "sources"}</span>
          ) : null
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setPage(1);
              setStatus(s);
            }}
            className={`chip ${status === s ? "chip-active" : "chip-idle"}`}
          >
            {s ? statusLabel(s) : "All"}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading && <SkeletonTable rows={8} cols={4} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState
            icon={IconDatabase}
            title="No sources yet"
            description="Sources appear here once a task starts collecting."
            action={
              <Link to="/create" className="btn-primary">
                Start a task
                <IconChevronRight size={15} />
              </Link>
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
                      <th className="th">Source</th>
                      <th className="th">Type</th>
                      <th className="th">Status</th>
                      <th className="th">Collected</th>
                      <th className="th text-right">Task</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((s) => (
                      <tr key={s.id} className="tr">
                        <td className="td max-w-sm">
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group inline-flex max-w-full items-center gap-1.5"
                          >
                            <span className="truncate font-medium text-accent group-hover:underline">
                              {hostOf(s.url)}
                            </span>
                            <IconExternal size={13} className="shrink-0 text-slate-400" />
                          </a>
                          {pathOf(s.url) && (
                            <p className="truncate font-mono text-[11px] text-slate-400 dark:text-slate-500">
                              {pathOf(s.url)}
                            </p>
                          )}
                          {s.errorMessage && (
                            <p className="mt-1 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                              <IconAlert size={13} className="mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{s.errorMessage}</span>
                            </p>
                          )}
                        </td>
                        <td className="td">
                          <span className="tag">{s.type}</span>
                        </td>
                        <td className="td">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="td whitespace-nowrap text-slate-500 dark:text-slate-400" title={formatDateTime(s.createdAt)}>
                          {relativeTime(s.createdAt)}
                        </td>
                        <td className="td text-right">
                          <Link to={`/tasks/${s.taskId}`} className="btn-ghost btn-xs">
                            Open task
                            <IconChevronRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination
              className="mt-4"
              page={page}
              totalPages={totalPages}
              total={data.total}
              unit="source"
              onChange={setPage}
              loading={loading}
            />
          </>
        )}
      </div>
    </div>
  );
}

