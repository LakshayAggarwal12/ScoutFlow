import "dotenv/config"; // must run before any other module reads process.env
import { app } from "./app.js";
import { env } from "./config/env.js";
import { startTaskWorker } from "./queue/taskWorker.js";

app.listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port} (demoMode=${env.demoMode})`);
});

// Runs the background job worker in the same process by default, so a
// single `npm run dev` gives a fully working system with no extra setup.
// Set WORKER_MODE=separate and run `npm run worker` as its own process for
// a production-style split (recommended once real traffic needs the API
// and the workers to scale independently).
if (env.workerMode !== "separate") {
  startTaskWorker();
  console.log(`Task worker running in-process (concurrency=${env.taskConcurrency})`);
}
