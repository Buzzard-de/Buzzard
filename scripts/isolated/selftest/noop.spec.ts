import fs from "node:fs";
import { test, expect } from "@playwright/test";

// Reaching this test means the global setup accepted the stack. It leaves a mark the self-test looks for.
test("global setup let the run start", () => {
  const mark = process.env.BUZZARD_SELFTEST_MARK;
  if (mark) fs.writeFileSync(mark, "started\n");
  expect(true).toBe(true);
});
