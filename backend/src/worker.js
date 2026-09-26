import "dotenv/config";
import { startTaskWorker } from "./queue/taskWorker.js";
import { env } from "./config/env.js";

startTaskWorker();
console.log(`Task worker running standalone (concurrency=${env.taskConcurrency})`);
