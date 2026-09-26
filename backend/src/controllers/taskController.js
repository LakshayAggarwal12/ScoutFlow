import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as taskService from "../services/taskService.js";
import { exportDatasetCsv, exportDatasetJson } from "../services/exportService.js";
import { enqueueTaskRun, taskQueue } from "../queue/taskQueue.js";
import { logStep } from "../services/logService.js";
import { AppError } from "../utils/AppError.js";

async function enqueueAndTrack(taskId) {
  const job = await enqueueTaskRun(taskId);
  await taskService.prepareForRun(taskId, job.id);
  return job;
}

export const createTask = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  const task = await taskService.createTask(prompt);
  await enqueueAndTrack(task.id);
  res.status(201).json(await taskService.getTask(task.id));
});

export const listTasks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { status } = req.query;
  const result = await taskService.listTasks({ page, limit, status });
  res.json(result);
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.getTask(req.params.id);
  res.json(task);
});

export const runTask = asyncHandler(async (req, res) => {
  await taskService.getTask(req.params.id); // 404s if missing
  await enqueueAndTrack(req.params.id);
  res.json({ message: "Task run started", taskId: req.params.id });
});

export const cancelTask = asyncHandler(async (req, res) => {
  const task = await taskService.requestCancellation(req.params.id);

  // If the job hasn't started yet (still waiting/delayed in the queue),
  // cancel it immediately rather than waiting for the worker to pick it up
  // and hit the first cooperative checkpoint.
  if (task.jobId) {
    try {
      const job = await taskQueue.getJob(task.jobId);
      if (job) {
        const state = await job.getState();
        if (state === "waiting" || state === "delayed") {
          await job.remove();
          await taskService.updateTaskStatus(task.id, "CANCELLED");
          await logStep(task.id, "TASK", "CANCELLED", "Task cancelled before it started running");
        }
      }
    } catch {
      // If the queue can't be reached, the cooperative cancelRequested flag
      // set above still takes effect once/if the task does run.
    }
  }

  res.json(await taskService.getTask(req.params.id));
});

export const getWorkflow = asyncHandler(async (req, res) => {
  const workflow = await prisma.workflow.findFirst({
    where: { taskId: req.params.id },
    orderBy: { version: "desc" },
  });
  if (!workflow) throw new AppError("No workflow found", 404);
  res.json(workflow);
});

export const getLogs = asyncHandler(async (req, res) => {
  const logs = await prisma.executionLog.findMany({
    where: { taskId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.json(logs);
});

// Returns the latest dataset by default; ?version=N returns a specific
// earlier version (basic dataset versioning — each rerun of a task creates
// a new Dataset row rather than overwriting the last one).
export const getDataset = asyncHandler(async (req, res) => {
  const { version } = req.query;
  const where = { taskId: req.params.id };
  if (version) where.version = parseInt(version, 10);

  const dataset = await prisma.dataset.findFirst({ where, orderBy: { version: "desc" } });
  if (!dataset) throw new AppError("No dataset found for this task", 404);
  res.json(dataset);
});

export const listDatasetVersions = asyncHandler(async (req, res) => {
  const datasets = await prisma.dataset.findMany({
    where: { taskId: req.params.id },
    orderBy: { version: "desc" },
    select: { id: true, version: true, usedMockData: true, createdAt: true, _count: { select: { records: true } } },
  });
  res.json(datasets);
});

export const getRecords = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { search, location, sort, status, version } = req.query;

  const datasetWhere = { taskId: id };
  if (version) datasetWhere.version = parseInt(version, 10);
  const dataset = await prisma.dataset.findFirst({ where: datasetWhere, orderBy: { version: "desc" } });
  if (!dataset) throw new AppError("No dataset found for this task", 404);

  const where = { datasetId: dataset.id };
  if (status) where.validationStatus = status;
  const AND = [];
  if (search) {
    AND.push({
      OR: [
        { data: { path: ["company_name"], string_contains: search } },
        { data: { path: ["role"], string_contains: search } },
      ],
    });
  }
  if (location) {
    AND.push({ data: { path: ["location"], string_contains: location } });
  }
  if (AND.length) where.AND = AND;

  const orderBy = sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    prisma.record.findMany({
      where,
      include: { source: true },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.record.count({ where }),
  ]);

  res.json({ items, total, page, limit, datasetId: dataset.id, datasetVersion: dataset.version, usedMockData: dataset.usedMockData });
});

export const exportCsv = asyncHandler(async (req, res) => {
  const csv = await exportDatasetCsv(req.params.id);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="dataset-${req.params.id}.csv"`);
  res.send(csv);
});

export const exportJson = asyncHandler(async (req, res) => {
  const json = await exportDatasetJson(req.params.id);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="dataset-${req.params.id}.json"`);
  res.send(JSON.stringify(json, null, 2));
});
