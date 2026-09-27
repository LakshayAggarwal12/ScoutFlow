import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [totalTasks, activeTasks, datasets, records, recentTasks] = await Promise.all([
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: { in: ["PLANNING", "QUEUED", "RUNNING"] } } }),
    prisma.dataset.count({ where: { task: { userId } } }),
    prisma.record.count({ where: { dataset: { task: { userId } } } }),
    prisma.task.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  res.json({ totalTasks, activeTasks, datasets, records, recentTasks });
});
