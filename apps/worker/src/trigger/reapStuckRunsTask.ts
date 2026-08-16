import { schedules, logger } from "@trigger.dev/sdk/v3";
import { prisma, withRetry } from "@nextflow/db";

const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // run-workflow's own maxDuration is 300s; 10m gives headroom for retries.
const TIMEOUT_ERROR = "Timed out — this run took too long and was stopped automatically.";

/**
 * Safety net for the SSE-less architecture: if the run-workflow task crashes,
 * gets evicted, or Trigger.dev itself has an outage, the WorkflowRun row would
 * otherwise stay "running" forever and the client would poll indefinitely.
 */
export const reapStuckRunsTask = schedules.task({
  id: "reap-stuck-runs",
  cron: "*/5 * * * *",
  run: async () => {
    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);
    const stuck = await withRetry(() => prisma.workflowRun.findMany({
      where: { status: "running", startedAt: { lt: cutoff } },
      select: { id: true },
    }));
    if (stuck.length === 0) return { reaped: 0 };

    for (const run of stuck) {
      await withRetry(() => prisma.nodeRun.updateMany({
        where: { workflowRunId: run.id, status: "running" },
        data: { status: "failed", error: TIMEOUT_ERROR, completedAt: new Date() },
      }));
      await withRetry(() => prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: "failed", error: TIMEOUT_ERROR, completedAt: new Date() },
      }));
    }
    logger.warn("Reaped stuck workflow runs", { count: stuck.length, runIds: stuck.map(r => r.id) });
    return { reaped: stuck.length };
  },
});
