import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as taskService from "../services/taskService.js";
import * as workflowService from "../services/workflowService.js";
import { exportDatasetCsv, exportDatasetJson, exportDatasetXlsx } from "../services/exportService.js";
import { enqueueTaskRun, taskQueue } from "../queue/taskQueue.js";
import { logStep } from "../services/logService.js";
import { AppError } from "../utils/AppError.js";

async function enqueueAndTrack(taskId) {
  const job = await enqueueTaskRun(taskId);
  await taskService.prepareForRun(taskId, job.id);
  return job;
}

// Ownership guard for read/export endpoints. Mirrors getTask: 404 (not 403)
// when the task belongs to another user, to avoid enumeration. Previously
// records/exports/dataset/logs/workflow were readable cross-account.
async function requireOwnedTask(taskId, userId) {
  const task = await taskService.getTask(taskId);
  if (task.userId && task.userId !== userId) {
    throw new AppError("Task not found", 404);
  }
  return task;
}

export const createTask = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  const userId = req.user?.id;
  const task = await taskService.createTask(prompt, userId);
  await enqueueAndTrack(task.id);
  res.status(201).json(await taskService.getTask(task.id));
});

export const listTasks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { status } = req.query;
  const userId = req.user?.id;
  const result = await taskService.listTasks({ page, limit, status, userId });
  res.json(result);
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.getTask(req.params.id);
  // Ownership: null userId means task was created before auth was added (allow it through)
  if (task.userId && task.userId !== req.user.id) {
    throw new AppError("Task not found", 404); // 404 not 403, to avoid enumeration
  }
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

// "Manage collection tasks" - a task can be permanently removed once it's
// no longer active. Deleting cascades to its workflows/sources/dataset/
// records/logs at the DB level (see prisma/schema.prisma onDelete rules).
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await taskService.getTask(req.params.id);
  const ACTIVE = ["PLANNING", "QUEUED", "RUNNING"];
  if (ACTIVE.includes(task.status)) {
    throw new AppError("Cancel the task before deleting it", 409);
  }
  await prisma.task.delete({ where: { id: task.id } });
  res.status(204).send();
});

export const getWorkflow = asyncHandler(async (req, res) => {
  await requireOwnedTask(req.params.id, req.user.id);
  const { version } = req.query;
  const workflow = await workflowService.getWorkflowForTask(req.params.id, version ? parseInt(version, 10) : undefined);
  res.json(workflow);
});

// Powers "revisit previous workflows" - lists every plan version the AI has
// generated for this task across its original run and any reruns.
export const listWorkflowVersions = asyncHandler(async (req, res) => {
  await requireOwnedTask(req.params.id, req.user.id);
  const versions = await workflowService.listWorkflowVersions(req.params.id);
  res.json(versions);
});

export const getLogs = asyncHandler(async (req, res) => {
  await requireOwnedTask(req.params.id, req.user.id);
  const logs = await prisma.executionLog.findMany({
    where: { taskId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.json(logs);
});

// Returns the latest dataset by default; ?version=N returns a specific
// earlier version (basic dataset versioning - each rerun of a task creates
// a new Dataset row rather than overwriting the last one).
export const getDataset = asyncHandler(async (req, res) => {
  await requireOwnedTask(req.params.id, req.user.id);
  const { version } = req.query;
  const where = { taskId: req.params.id };
  if (version) where.version = parseInt(version, 10);

  const dataset = await prisma.dataset.findFirst({ where, orderBy: { version: "desc" } });
  if (!dataset) throw new AppError("No dataset found for this task", 404);
  res.json(dataset);
});

export const listDatasetVersions = asyncHandler(async (req, res) => {
  await requireOwnedTask(req.params.id, req.user.id);
  const datasets = await prisma.dataset.findMany({
    where: { taskId: req.params.id },
    orderBy: { version: "desc" },
    select: { id: true, version: true, usedMockData: true, createdAt: true, _count: { select: { records: true } } },
  });
  res.json(datasets);
});

export const getRecords = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await requireOwnedTask(id, req.user.id);
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const { search, location, sort, status, version } = req.query;

  const datasetWhere = { taskId: id };
  if (version) datasetWhere.version = parseInt(version, 10);
  const dataset = await prisma.dataset.findFirst({ where: datasetWhere, orderBy: { version: "desc" } });
  if (!dataset) throw new AppError("No dataset found for this task", 404);

  const where = { datasetId: dataset.id };
  if (status) where.validationStatus = status;

  const AND = [];
  // Generic search across the task's REQUESTED fields (dynamic) plus common
  // field names - previously a hardcoded list missed requested fields like
  // "founders"/"funding", so searching for them silently returned nothing.
  if (search) {
    const FALLBACK_KEYS = [
      "company_name", "role", "title", "name", "description", "startup_name",
      "website", "industry", "category", "entity", "keyword", "organization", "author",
    ];
    const searchPaths = [...new Set([...(task.structuredRequirement?.fields || []), ...FALLBACK_KEYS])];
    AND.push({
      OR: searchPaths.map((field) => ({ data: { path: [field], string_contains: search } })),
    });
  }
  if (location) {
    AND.push({
      OR: [
        { data: { path: ["location"], string_contains: location } },
        { data: { path: ["candidate_required_location"], string_contains: location } },
      ],
    });
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

  res.json({
    items,
    total,
    page,
    limit,
    datasetId: dataset.id,
    datasetVersion: dataset.version,
    usedMockData: dataset.usedMockData,
  });
});

export const exportCsv = asyncHandler(async (req, res) => {
  await requireOwnedTask(req.params.id, req.user.id);
  const csv = await exportDatasetCsv(req.params.id, req.query.version);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="scoutflow-dataset-${req.params.id}.csv"`);
  res.send(csv);
});

export const exportJson = asyncHandler(async (req, res) => {
  await requireOwnedTask(req.params.id, req.user.id);
  const json = await exportDatasetJson(req.params.id, req.query.version);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="scoutflow-dataset-${req.params.id}.json"`);
  res.send(JSON.stringify(json, null, 2));
});

export const exportXlsx = asyncHandler(async (req, res) => {
  await requireOwnedTask(req.params.id, req.user.id);
  const buffer = await exportDatasetXlsx(req.params.id, req.query.version);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="scoutflow-dataset-${req.params.id}.xlsx"`);
  res.send(buffer);
});
