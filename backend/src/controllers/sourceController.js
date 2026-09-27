import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

// Supports ?taskId= and ?status= so the frontend's Sources page can show
// per-task provenance/health without loading every source in the system.
export const listSources = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { taskId, status } = req.query;

  const where = { task: { userId: req.user.id } };
  if (taskId) where.taskId = taskId;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.source.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.source.count({ where }),
  ]);
  res.json({ items, total, page, limit });
});

export const getSource = asyncHandler(async (req, res) => {
  const source = await prisma.source.findFirst({ 
    where: { id: req.params.id, task: { userId: req.user.id } } 
  });
  if (!source) throw new AppError("Source not found", 404);
  res.json(source);
});

export const getSourceHealth = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const task = await prisma.task.findFirst({ where: { id: taskId, userId: req.user.id } });
  if (!task) throw new AppError("Task not found", 404);

  const grouped = await prisma.source.groupBy({
    by: ["status"],
    where: { taskId },
    _count: { status: true },
  });
  const summary = Object.fromEntries(grouped.map((g) => [g.status, g._count.status]));
  res.json(summary);
});
