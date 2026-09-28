// Runs `worker` over `items` with at most `limit` concurrent executions.
// Results mirror Promise.allSettled ordering (one entry per item).
// Used so page fetches and LLM extractions run in parallel without ever
// saturating the network/API with unbounded requests.
export async function mapWithConcurrency(items, limit, worker) {
  const list = Array.from(items);
  const results = new Array(list.length);
  let next = 0;
  const threads = Array.from({ length: Math.max(1, Math.min(limit, list.length || 1)) }, async () => {
    while (next < list.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await worker(list[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(threads);
  return results;
}