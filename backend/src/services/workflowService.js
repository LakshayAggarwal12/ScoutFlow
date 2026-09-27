import { prisma } from "../config/prisma.js";
import { WorkflowPlanSchema } from "./schemas.js";
import { AppError } from "../utils/AppError.js";

export async function saveWorkflow(taskId, definition) {
  const parsed = WorkflowPlanSchema.safeParse(definition);
  if (!parsed.success) {
    throw new AppError("AI-generated workflow failed validation", 422, parsed.error.flatten());
  }

  const latest = await prisma.workflow.findFirst({
    where: { taskId },
    orderBy: { version: "desc" },
  });
  const version = latest ? latest.version + 1 : 1;

  return prisma.workflow.create({
    data: { taskId, version, definition: parsed.data, status: "PLANNED" },
  });
}

export async function getWorkflowForTask(taskId, version) {
  const where = { taskId };
  if (version) where.version = version;
  const workflow = await prisma.workflow.findFirst({
    where,
    orderBy: { version: "desc" },
  });
  if (!workflow) throw new AppError("No workflow found for this task", 404);
  return workflow;
}

// Powers "revisit previous workflows" - every rerun of a task creates a new
// workflow version rather than overwriting the last one, so the plan the AI
// generated for an earlier run stays inspectable.
export async function listWorkflowVersions(taskId) {
  return prisma.workflow.findMany({
    where: { taskId },
    orderBy: { version: "desc" },
    select: { id: true, version: true, status: true, createdAt: true },
  });
}

export async function markWorkflowStatus(id, status) {
  return prisma.workflow.update({ where: { id }, data: { status } });
}
