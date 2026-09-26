import { Queue } from "bullmq";
import { redisConnection } from "./connection.js";
import { env } from "../config/env.js";

export const TASK_QUEUE_NAME = "task-execution";

export const taskQueue = new Queue(TASK_QUEUE_NAME, { connection: redisConnection });

// Enqueues a task run. Used both for the initial run (task creation) and for
// reruns/retries — same job shape either way, so the worker doesn't need to
// distinguish them.
export async function enqueueTaskRun(taskId) {
  const job = await taskQueue.add(
    "run-task",
    { taskId },
    {
      attempts: env.taskMaxAttempts,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 200 },
    }
  );
  return job;
}
