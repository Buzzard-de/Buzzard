import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("local metrics snapshot", () => {
  it("never claims Prometheus or a live exporter", async () => {
    const { collectLocalMetrics, getLocalMetricsSnapshot } = require("../lib/operations/localMetrics.js");
    const snapshot = await collectLocalMetrics();
    expect(snapshot.diagnosticOnly).toBe(true);
    expect(snapshot.prometheus).toBe(false);
    expect(snapshot.liveExporter).toBe(false);
    expect(snapshot.productionVerified).toBe(false);
    expect(snapshot.secretsExposed).toBe(false);
    const offline = getLocalMetricsSnapshot(null);
    expect(offline.prometheus).toBe(false);
    expect(offline.errors.jobFailed).toBeNull();
  });
});

describe("local alert generation", () => {
  it("generates in-process alerts without dispatch", async () => {
    const { generateLocalAlerts, collectLocalAlerts } = require("../lib/operations/localAlerts.js");
    const generated = generateLocalAlerts({
      overall: "WARNING",
      activeRules: [{ rule: "repeated_job_failures", level: "WARNING", message: "1 failed job(s)", retryable: true }],
    });
    expect(generated.liveDispatch).toBe(false);
    expect(generated.pager).toBe(false);
    expect(generated.smtpSent).toBe(false);
    expect(generated.webhookSent).toBe(false);
    expect(generated.alerts[0].dispatched).toBe(false);
    expect(generated.deliveryBlocked).toBe("no_authorized_alerting_backend");

    const collected = await collectLocalAlerts();
    expect(collected.liveDispatch).toBe(false);
    expect(collected.secretsExposed).toBe(false);
    expect(Array.isArray(collected.alerts)).toBe(true);
  });
});
