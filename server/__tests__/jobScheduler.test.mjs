import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jobScheduler = require("../lib/jobScheduler.js");

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

  it("tickScheduler does not enqueue due jobs", () => {
    const enqueued = jobScheduler.tickScheduler();
    expect(enqueued).toEqual([]);
  });

  it("recurring schedule computes next run", () => {
    const next = jobScheduler.computeNextRun(
      { scheduleType: jobScheduler.SCHEDULE_TYPE.RECURRING, intervalMs: 3600_000 },
      new Date("2026-01-01T00:00:00.000Z")
    );
    expect(new Date(next).getTime()).toBe(new Date("2026-01-01T01:00:00.000Z").getTime());
  });
});
