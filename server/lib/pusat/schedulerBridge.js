/**
 * jobScheduler → Pusat bridge. Keeps Pusat as the only orchestrator.
 */

const jobQueue = require("../jobQueue");
const controlCenter = require("../controlCenter");
const worker = require("./worker");
const events = require("./events");

function enqueueScheduled(schedule) {
  if (schedule.jobType === "AI_TASK" && schedule.payload?.taskId) {
    const job = worker.enqueueTaskJob(schedule.payload.taskId, {
      createdBy: schedule.createdBy || "jobScheduler",
      priority: schedule.priority,
      maxRetries: schedule.maxRetries,
    });
    events.produce("pusat.scheduler.enqueued", {
      scheduleId: schedule.id,
      jobId: job.id,
      taskId: schedule.payload.taskId,
    });
    return { job, pusat: true };
  }

  const job = jobQueue.enqueueJob({
    jobType: schedule.jobType,
    payload: { ...schedule.payload, scheduleName: schedule.name },
    priority: schedule.priority,
    maxRetries: schedule.maxRetries,
    scheduleId: schedule.id,
    createdBy: schedule.createdBy,
  });
  controlCenter.recordSystemEvent({
    eventType: "scheduler.enqueued",
    actorType: "jobScheduler",
    actorId: schedule.createdBy || "scheduler",
    resourceType: "job",
    resourceId: job.id,
    summary: schedule.jobType,
    metadata: { scheduleId: schedule.id, pusatBound: false },
  });
  return { job, pusat: false };
}

module.exports = { enqueueScheduled };
