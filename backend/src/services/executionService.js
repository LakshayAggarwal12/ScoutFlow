import { prisma } from "../config/prisma.js";
import { parseRequirement, planWorkflow } from "./aiClient.js";
import { StructuredRequirementSchema } from "./schemas.js";
import { saveStructuredRequirement, updateTaskStatus, isCancelRequested } from "./taskService.js";
import { saveWorkflow, markWorkflowStatus } from "./workflowService.js";
import { collectSources } from "./collectionService.js";
import { runPipeline } from "./pipelineService.js";
import { logStep } from "./logService.js";
import { AppError } from "../utils/AppError.js";

class TaskCancelledError extends Error {}

async function checkpoint(taskId) {
  if (await isCancelRequested(taskId)) {
    throw new TaskCancelledError("Cancelled by user");
  }
}

// Full orchestration for a task run. Invoked by the BullMQ worker
// (src/queue/taskWorker.js), one job per run/rerun. Cooperative cancellation:
// checks the task's `cancelRequested` flag between stages rather than being
// killed mid-write, so a cancel never leaves a half-written dataset.
//
// `bullJob`, when provided, lets this function tell whether the current
// attempt is the job's last one - an error on a non-final attempt is left
// for BullMQ's own retry/backoff rather than being recorded as a hard
// task failure, so a transient AI-service hiccup doesn't need a manual
// "Retry" click.
export async function executeTask(taskId, { bullJob } = {}) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new AppError("Task not found", 404);

  try {
    await checkpoint(taskId);
    await updateTaskStatus(taskId, "PLANNING");
    await logStep(taskId, "REQUIREMENT", "RUNNING", "Parsing natural-language requirement");

    const aiRequirement = await parseRequirement(task.prompt);
    const parsedReq = StructuredRequirementSchema.safeParse(aiRequirement);
    if (!parsedReq.success) {
      throw new AppError("AI requirement parsing failed validation", 422, parsedReq.error.flatten());
    }
    const structuredRequirement = parsedReq.data;
    await saveStructuredRequirement(taskId, structuredRequirement);
    await logStep(taskId, "REQUIREMENT", "COMPLETED", "Requirement understood", structuredRequirement);

    await checkpoint(taskId);
    await logStep(taskId, "PLANNING", "RUNNING", "Generating workflow plan");
    const aiWorkflow = await planWorkflow(structuredRequirement);
    const workflow = await saveWorkflow(taskId, aiWorkflow);
    await logStep(taskId, "PLANNING", "COMPLETED", "Workflow generated");

    await checkpoint(taskId);
    await markWorkflowStatus(workflow.id, "RUNNING");
    await updateTaskStatus(taskId, "RUNNING");

    await logStep(taskId, "COLLECTION", "RUNNING", "Discovering and collecting sources");
    const { sources, usedMockData } = await collectSources(taskId, structuredRequirement);
    await logStep(
      taskId,
      "COLLECTION",
      "COMPLETED",
      `${sources.length} sources collected${usedMockData ? " (demo/mock data)" : ""}`
    );

    await checkpoint(taskId);
    const freshTask = await prisma.task.findUnique({ where: { id: taskId } });
    const { dataset, stats } = await runPipeline(freshTask, sources, { usedMockData });

    await markWorkflowStatus(workflow.id, "COMPLETED");
    await updateTaskStatus(taskId, "COMPLETED");
    await logStep(taskId, "TASK", "COMPLETED", "Task completed", { datasetId: dataset.id, ...stats });

    return { dataset, stats };
  } catch (err) {
    if (err instanceof TaskCancelledError) {
      await updateTaskStatus(taskId, "CANCELLED");
      await logStep(taskId, "TASK", "CANCELLED", "Task cancelled by user");
      return null; // not a failure - stop quietly
    }

    const attemptsMade = bullJob ? bullJob.attemptsMade + 1 : 1;
    const maxAttempts = bullJob?.opts?.attempts || 1;
    const isFinalAttempt = attemptsMade >= maxAttempts;

    if (isFinalAttempt) {
      await updateTaskStatus(taskId, "FAILED");
      await logStep(taskId, "TASK", "FAILED", err.message);
    } else {
      await logStep(
        taskId,
        "TASK",
        "RETRY_SCHEDULED",
        `Attempt ${attemptsMade}/${maxAttempts} failed (${err.message}) - retrying`
      );
      await updateTaskStatus(taskId, "QUEUED");
    }
    throw err; // rethrow so BullMQ records the failure / schedules the retry
  }
}
