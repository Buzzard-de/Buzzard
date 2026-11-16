import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("jobQueue lock", () => {
  let jobQueue;

  beforeEach(() => {
    process.env.BUZZARD_JOB_LOCK_TTL_MS = "60000";
    delete require.cache[require.resolve("../lib/jobQueue.js")];
    jobQueue = require("../lib/jobQueue.js");
  });

  it("refuses to create a runnable job without approval", () => {
    expect(() => jobQueue.enqueueJob({ jobType: "SYSTEM_HEALTH", priority: "HIGH" })).toThrow(
      expect.objectContaining({ code: "APPROVAL_REQUIRED" })
    );
  });

  it("refuses to requeue a missing job", () => {
    expect(jobQueue.retryJob("job_missing_approval")).toBeNull();
  });
});
