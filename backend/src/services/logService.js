import { prisma } from "../config/prisma.js";

export async function logStep(taskId, step, status, message = null, metadata = null) {
  return prisma.executionLog.create({
    data: { taskId, step, status, message, metadata: metadata || undefined },
  });
}
