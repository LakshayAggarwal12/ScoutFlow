import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStats, listTasks } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { SkeletonStat } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import {
  IconActivity,
  IconChevronRight,
  IconDatabase,
  IconSparkles,
  IconTable,
  IconTasks,
} from "../components/icons.jsx";
import { relativeTime } from "../lib/format.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activeTasks, setActiveTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [statsData, activeData] = await Promise.all([
        getStats(),
        listTasks({ status: "RUNNING", limit: 5 }),
      ]);
      setStats(statsData);
      setActiveTasks(activeData?.items || []);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Poll every 2.5s only while there are active tasks
  useEffect(() => {
    if (activeTasks.length === 0) return;
    const id = setInterval(loadAll, 2500);
    return () => clearInterval(id);
  }, [activeTasks.length, loadAll]);

  return (
    <div className="page page-lg animate-fade-in">
      <PageHeader
        eyebrow="Workspace"
        title="Dashboard"
        description="Overview of your data collection activity."
        actions={
          <Link to="/create" className="btn-primary">
            <IconSparkles size={16} />
            New Task
          </Link>
        }
      />

      {loading && (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStat key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="mt-6">
          <ErrorState message={error} onRetry={loadAll} />
        </div>
      )}

      {!loading && !error && stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={IconTasks} label="Total Tasks" value={stats.totalTasks} tone="slate" hint="All time" />
            <StatCard
              icon={IconActivity}
              label="Active Tasks"
              value={stats.activeTasks}
              tone="accent"
              hint={stats.activeTasks > 0 ? "In progress now" : "Nothing running"}
            />
            <StatCard icon={IconDatabase} label="Datasets" value={stats.datasets} tone="violet" hint="Versions stored" />
            <StatCard icon={IconTable} label="Records Collected" value={stats.records} tone="emerald" hint="Validated rows" />
          </div>

          {/* Active tasks live feed */}
          {activeTasks.length > 0 && (
            <section className="mt-8">
              <div className="card overflow-hidden">
                <div className="panel-head">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <div>
                      <h2 className="section-title">Running Now</h2>
                      <p className="section-sub">Live status, refreshed automatically</p>
                    </div>
                  </div>
                  <span className="tag tabular-nums">{activeTasks.length} active</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeTasks.map((task) => (
                    <Link
                      key={task.id}
                      to={`/tasks/${task.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 row-hover"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                        {task.prompt}
                      </span>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusBadge status={task.status} />
                        <IconChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Recent tasks */}
          <section className="mt-8">
            <div className="card overflow-hidden">
              <div className="panel-head">
                <div>
                  <h2 className="section-title">Recent Tasks</h2>
                  <p className="section-sub">Your five most recent collection runs</p>
                </div>
                <Link to="/tasks" className="btn-ghost btn-sm">
                  View all
                  <IconChevronRight size={15} />
                </Link>
              </div>

              {stats.recentTasks.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={IconSparkles}
                    title="No tasks yet"
                    description="Create your first task to start collecting real data."
                    action={
                      <Link to="/create" className="btn-primary">
                        <IconSparkles size={16} />
                        Create Task
                      </Link>
                    }
                  />
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.recentTasks.map((task) => (
                    <Link
                      key={task.id}
                      to={`/tasks/${task.id}`}
                      className="group flex items-center justify-between gap-4 px-5 py-4 row-hover"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink dark:text-slate-100">
                          {task.prompt}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                          {relativeTime(task.createdAt)}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusBadge status={task.status} />
                        {task.status === "COMPLETED" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/tasks/${task.id}/dataset`);
                            }}
                            className="btn-secondary btn-xs"
                          >
                            Dataset
                            <IconChevronRight size={13} />
                          </button>
                        )}
                        <IconChevronRight
                          size={16}
                          className="hidden text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 sm:block dark:text-slate-600"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

