import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

const ACTIVE_STATUSES = ["PLANNING", "QUEUED", "RUNNING"];
const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "CANCELLED"];

export async function createTask(prompt, userId = null) {
  if (!prompt || !prompt.trim()) {
    throw new AppError("prompt is required", 422);
  }
  return prisma.task.create({ data: { prompt: prompt.trim(), status: "DRAFT", userId } });
}

export async function getTask(id) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new AppError("Task not found", 404);
  return task;
}

export async function listTasks({ page = 1, limit = 20, status, userId } = {}) {
  const skip = (page - 1) * limit;
  const where = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;
  
  const [items, total] = await Promise.all([
    prisma.task.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.task.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function updateTaskStatus(id, status) {
  return prisma.task.update({ where: { id }, data: { status } });
}

export async function saveStructuredRequirement(id, structuredRequirement) {
  return prisma.task.update({ where: { id }, data: { structuredRequirement, status: "PLANNING" } });
}

// Called each time a task is (re)enqueued so a fresh run starts clean:
// clears any stale cancel flag, bumps the retry counter after the first run,
// and records the BullMQ job id so cancellation can find it later.
export async function prepareForRun(id, jobId) {
  const task = await getTask(id);
  if (ACTIVE_STATUSES.includes(task.status)) {
    throw new AppError("Task is already running", 409);
  }
  const isRerun = task.status !== "DRAFT";
  return prisma.task.update({
    where: { id },
    data: {
      jobId,
      cancelRequested: false,
      retryCount: isRerun ? { increment: 1 } : task.retryCount,
      status: "QUEUED",
    },
  });
}

// Cooperative cancellation: the pipeline checks this flag between stages
// rather than being killed mid-write, so partial work is never left corrupt.
export async function requestCancellation(id) {
  const task = await getTask(id);
  if (TERMINAL_STATUSES.includes(task.status)) {
    throw new AppError(`Cannot cancel a task in status ${task.status}`, 409);
  }
  return prisma.task.update({ where: { id }, data: { cancelRequested: true } });
}

export async function isCancelRequested(id) {
  const task = await prisma.task.findUnique({ where: { id }, select: { cancelRequested: true } });
  return Boolean(task?.cancelRequested);
}

// Kept for direct/synchronous cancellation of a task that never made it into
// the queue (e.g. still DRAFT).
export async function cancelTask(id) {
  const task = await getTask(id);
  if (TERMINAL_STATUSES.includes(task.status)) {
    throw new AppError(`Cannot cancel a task in status ${task.status}`, 409);
  }
  return updateTaskStatus(id, "CANCELLED");
}
