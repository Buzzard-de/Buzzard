import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jobScheduler = require("../lib/jobScheduler.js");
const jobQueue = require("../lib/jobQueue.js");

describe("jobScheduler", () => {
  it("creates one-time schedule", () => {
    const schedule = jobScheduler.createSchedule({
      name: "test-once",
      jobType: "SYSTEM_HEALTH",
      scheduleType: jobScheduler.SCHEDULE_TYPE.ONE_TIME,
      nextRunAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(schedule.id).toMatch(/^sched_/);
    expect(schedule.enabled).toBe(true);
  });

  it("tickScheduler enqueues due jobs", () => {
    jobScheduler.createSchedule({
      name: "due-test",
      jobType: "NOTIFICATION",
      scheduleType: jobScheduler.SCHEDULE_TYPE.ONE_TIME,
      nextRunAt: new Date(Date.now() - 5000).toISOString(),
    });
    const enqueued = jobScheduler.tickScheduler();
    expect(enqueued.length).toBeGreaterThan(0);
    expect(enqueued[0].jobType).toBe("NOTIFICATION");
  });

  it("recurring schedule computes next run", () => {
    const next = jobScheduler.computeNextRun(
      { scheduleType: jobScheduler.SCHEDULE_TYPE.RECURRING, intervalMs: 3600_000 },
      new Date("2026-01-01T00:00:00.000Z")
    );
    expect(new Date(next).getTime()).toBe(new Date("2026-01-01T01:00:00.000Z").getTime());
  });
});
