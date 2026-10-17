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

  it("item 185: dispatch does not send even when SMTP or webhook env is present", () => {
    const { dispatch } = require("../lib/operations/localAlerts.js");
    const previousHost = process.env.SMTP_HOST;
    const previousHook = process.env.ALERT_WEBHOOK_URL;
    process.env.SMTP_HOST = "smtp.example.invalid";
    process.env.ALERT_WEBHOOK_URL = "https://example.invalid/hook";
    try {
      const ai = dispatch({ actor: "guardian", forceDispatch: true });
      expect(ai.reason).toBe("SELF_APPROVE_DENIED");
      expect(ai.liveDispatch).toBe(false);
      expect(ai.httpAttempted).toBe(false);

      const forced = dispatch({ actor: "operator", forceDispatch: true });
      expect(forced.reason).toBe("ALERT_DISPATCH_BLOCKED");
      expect(forced.forceDispatchIgnored).toBe(true);
      expect(forced.smtpConfiguredIgnored).toBe(true);
      expect(forced.webhookConfiguredIgnored).toBe(true);
      expect(forced.smtpSent).toBe(false);
      expect(forced.webhookSent).toBe(false);
      expect(forced.pager).toBe(false);
      expect(forced.webhookUrlIncluded).toBe(false);
    } finally {
      if (previousHost === undefined) delete process.env.SMTP_HOST;
      else process.env.SMTP_HOST = previousHost;
      if (previousHook === undefined) delete process.env.ALERT_WEBHOOK_URL;
      else process.env.ALERT_WEBHOOK_URL = previousHook;
    }
  });
});
