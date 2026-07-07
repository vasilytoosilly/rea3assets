import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getProcessor } from "./registry";

const STALE_RUN_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

/**
 * Mark runs stuck in "running" state as "failed" with an error message.
 * Called at runner startup to clean up orphaned runs from process crashes.
 */
export async function recoverStaleRuns(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_RUN_TIMEOUT_MS);
  const result = await prisma.pipelineRun.updateMany({
    where: {
      status: "running",
      started_at: { lt: cutoff },
    },
    data: {
      status: "failed",
      completed_at: new Date(),
      error_message: "Run timed out — process may have crashed or stalled",
    },
  });
  if (result.count > 0) {
    logger.warn("Recovered stale pipeline runs", { count: result.count });
  }
  return result.count;
}

/**
 * Executes every step of a pipeline run in sort_order, invoking the
 * registered processor function for each step and recording results.
 *
 * Called fire-and-forget after the API creates the run + step result records.
 */
export async function runPipeline(pipelineRunId: string): Promise<void> {
  const run = await prisma.pipelineRun.findUnique({
    where: { id: pipelineRunId },
    include: {
      pipeline: {
        include: {
          steps: { orderBy: { sort_order: "asc" } },
        },
      },
      asset_version: true,
    },
  });

  if (!run) {
    logger.error("PipelineRun not found for execution", { pipelineRunId });
    return;
  }

  logger.info("Pipeline run started", {
    pipelineRunId,
    pipeline: run.pipeline.name,
    assetVersion: run.asset_version.id,
    stepCount: run.pipeline.steps.length,
  });

  // Mark run as "running" and set started_at
  await prisma.pipelineRun.update({
    where: { id: pipelineRunId },
    data: { status: "running", started_at: new Date() },
  });

  let finalStatus: string = "completed";
  let finalError: string | null = null;

  for (const step of run.pipeline.steps) {
    const processorFn = getProcessor(step.processor);

    if (!processorFn) {
      logger.warn("Unknown processor, skipping", {
        pipelineRunId,
        stepId: step.id,
        processor: step.processor,
      });
      await prisma.pipelineStepResult.updateMany({
        where: { run_id: pipelineRunId, processor: step.processor },
        data: { status: "skipped", error_message: `Unknown processor: ${step.processor}` },
      });
      continue;
    }

    const stepResult = await prisma.pipelineStepResult.findFirst({
      where: { run_id: pipelineRunId, processor: step.processor },
    });

    if (!stepResult) {
      logger.error("No PipelineStepResult found for step", {
        run_id: pipelineRunId,
        processor: step.processor,
      });
      finalStatus = "failed";
      finalError = `Missing PipelineStepResult for processor '${step.processor}'`;
      await prisma.pipelineStepResult.create({
        data: {
          run_id: pipelineRunId,
          processor: step.processor,
          status: "failed",
          error_message: finalError,
        },
      });
      break;
    }

    // Mark step as running
    await prisma.pipelineStepResult.update({
      where: { id: stepResult.id },
      data: { status: "running", started_at: new Date() },
    });

    logger.info("Executing processor", {
      pipelineRunId,
      processor: step.processor,
      sortOrder: step.sort_order,
    });

    try {
      const result = await processorFn({
        assetVersionId: run.asset_version.id,
        filePath: run.asset_version.file_path,
        pipelineRunId,
        pipelineStepId: stepResult.id,
        config: step.config as Record<string, unknown> | null,
      });

      if (result.success) {
        // Step completed
        await prisma.pipelineStepResult.update({
          where: { id: stepResult.id },
          data: {
            status: "completed",
            ...(result.output ? { output: JSON.parse(JSON.stringify(result.output)) } : {}),
            completed_at: new Date(),
          },
        });
        logger.info("Processor completed", {
          pipelineRunId,
          processor: step.processor,
        });
      } else {
        // Step failed — handle according to on_failure policy
        const errorMsg = result.error ?? "Processor returned failure";
        await prisma.pipelineStepResult.update({
          where: { id: stepResult.id },
          data: {
            status: "failed",
            error_message: errorMsg,
            completed_at: new Date(),
          },
        });

        logger.warn("Processor failed", {
          pipelineRunId,
          processor: step.processor,
          onFailure: step.on_failure,
          error: errorMsg,
        });

        if (step.on_failure === "stop") {
          finalStatus = "failed";
          finalError = `Step ${step.processor} failed: ${errorMsg}`;
          break;
        } else if (step.on_failure === "skip") {
          // Mark remaining steps as skipped, then break
          await markRemainingSkipped(pipelineRunId, step.sort_order, run.pipeline.steps);
          finalStatus = "completed";
          break;
        } else {
          // "warn" — continue to next step
          continue;
        }
      }
    } catch (err) {
      // Unexpected error in processor function itself
      const errMsg = String(err);
      await prisma.pipelineStepResult.update({
        where: { id: stepResult.id },
        data: {
          status: "failed",
          error_message: errMsg,
          completed_at: new Date(),
        },
      });

      logger.error("Processor threw exception", {
        pipelineRunId,
        processor: step.processor,
        error: errMsg,
      });

      if (step.on_failure === "stop") {
        finalStatus = "failed";
        finalError = `Step ${step.processor} threw: ${errMsg}`;
        break;
      } else if (step.on_failure === "skip") {
        await markRemainingSkipped(pipelineRunId, step.sort_order, run.pipeline.steps);
        finalStatus = "completed";
        break;
      } else {
        // "warn" — continue
        continue;
      }
    }
  }

  // Finalize run
  await prisma.pipelineRun.update({
    where: { id: pipelineRunId },
    data: {
      status: finalStatus,
      completed_at: new Date(),
      error_message: finalError,
    },
  });

  logger.info("Pipeline run finished", {
    pipelineRunId,
    status: finalStatus,
    error: finalError,
  });
}

/**
 * Marks all steps with sort_order > currentOrder as "skipped".
 */
async function markRemainingSkipped(
  runId: string,
  currentOrder: number,
  steps: Array<{ sort_order: number; processor: string }>,
): Promise<void> {
  const remainingProcessors = steps
    .filter((s) => s.sort_order > currentOrder)
    .map((s) => s.processor);

  if (remainingProcessors.length === 0) return;

  await prisma.pipelineStepResult.updateMany({
    where: {
      run_id: runId,
      processor: { in: remainingProcessors },
      status: "pending",
    },
    data: { status: "skipped" },
  });
}
