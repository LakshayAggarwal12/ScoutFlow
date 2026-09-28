export default function MockDataBadge() {
  return (
    <span
      className="badge bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60"
      title="This dataset was produced from seeded demo listings, not a live source, because no real source was reachable/configured."
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
      Mock data
    </span>
  );
}
