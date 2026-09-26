import { Worker } from "bullmq";
import { redisConnection } from "./connection.js";
import { TASK_QUEUE_NAME } from "./taskQueue.js";
import { executeTask } from "../services/executionService.js";
import { env } from "../config/env.js";

// Processes queued task runs in the background, off the HTTP request cycle.
// Concurrency and retry/backoff are configured on the queue (taskQueue.js);
// this worker just needs to know how to run one job.
export function startTaskWorker() {
  const worker = new Worker(
    TASK_QUEUE_NAME,
    async (job) => {
      const { taskId } = job.data;
      return executeTask(taskId, { bullJob: job });
    },
    { connection: redisConnection, concurrency: env.taskConcurrency }
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] task ${job?.data?.taskId} attempt ${job?.attemptsMade} failed: ${err.message}`);
  });
  worker.on("error", (err) => {
    console.error(`[worker] error: ${err.message}`);
  });

  return worker;
}
