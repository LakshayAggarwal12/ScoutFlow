import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

// Supports ?taskId= and ?status= so the frontend's Sources page can show
// per-task provenance/health without loading every source in the system.
export const listSources = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { taskId, status } = req.query;

  const where = {};
  if (taskId) where.taskId = taskId;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.source.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.source.count({ where }),
  ]);
  res.json({ items, total, page, limit });
});

export const getSource = asyncHandler(async (req, res) => {
  const source = await prisma.source.findUnique({ where: { id: req.params.id } });
  if (!source) throw new AppError("Source not found", 404);
  res.json(source);
});

// Aggregate counts by status for one task — powers the Sources page's
// health summary (e.g. "18 collected, 2 failed") without pulling every row.
export const getSourceHealth = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const grouped = await prisma.source.groupBy({
    by: ["status"],
    where: { taskId },
    _count: { status: true },
  });
  const summary = Object.fromEntries(grouped.map((g) => [g.status, g._count.status]));
  res.json(summary);
});
