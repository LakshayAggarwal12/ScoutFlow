import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalTasks, activeTasks, datasets, records, recentTasks] = await Promise.all([
    prisma.task.count(),
    prisma.task.count({ where: { status: { in: ["PLANNING", "QUEUED", "RUNNING"] } } }),
    prisma.dataset.count(),
    prisma.record.count(),
    prisma.task.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  res.json({ totalTasks, activeTasks, datasets, records, recentTasks });
});
