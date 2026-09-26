export default function MockDataBadge() {
  return (
    <span
      className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
      title="This dataset was produced from seeded demo listings, not a live source, because no real source was reachable/configured."
    >
      Mock data
    </span>
  );
}
