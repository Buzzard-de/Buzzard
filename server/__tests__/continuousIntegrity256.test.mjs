import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Esat Bey final hardening — login, HAC, fail-closed, incidents", () => {
  let pusat;
  let guardian;
  let esatSecurity;
  let identitySecurity;
  let totp;
  let circuitBreaker;

  beforeAll(() => {
    pusat = require("../lib/pusat");
    pusat.initialize(require("../lib/db").db);
    guardian = require("../lib/pusat/guardian");
    esatSecurity = require("../lib/pusat/esatSecurity");
    identitySecurity = require("../lib/identitySecurity");
    totp = require("../lib/totp");
    circuitBreaker = require("../lib/pusat/circuitBreaker");
  });

  afterEach(() => {
    guardian.clearIsolation();
    guardian.resetRateLimiter();
    esatSecurity.resetEsatState();
    circuitBreaker.reset("pusat:final-hardening");
  });

  it("keeps account login/register reachable without a prior session", () => {
    const { resolveRoutePermission } = require("../lib/routePermissions");
    expect(resolveRoutePermission("POST", "/api/account/login").public).toBe(true);
    expect(resolveRoutePermission("POST", "/api/account/register").public).toBe(true);
    expect(resolveRoutePermission("POST", "/api/identity-security/auth/login").public).toBe(true);
    expect(resolveRoutePermission("GET", "/api/account/me").authenticated).toBe(true);

    const { wrapRouteHandler } = require("../lib/globalAuthMiddleware");
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    wrapRouteHandler("POST", "/api/account/login", (_req, response) => {
      response.status(401).json({ success: false, errorKey: "account.auth.invalid" });
    })({ method: "POST", url: "/api/account/login", headers: {} }, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.errorKey).toBe("account.auth.invalid");
  });

  it("does not enable 2FA before confirm and rejects reused recovery codes", () => {
    const email = `final-2fa-${Date.now()}@buzzard.test`;
    const registered = identitySecurity.registerUser(
      { email, password: "correct-horse-battery-staple", firstName: "Esat", lastName: "Bey" },
      { headers: {}, socket: { remoteAddress: "127.0.0.1" } }
    );
    const setup = identitySecurity.setupTwoFactor(registered.userId, { headers: {}, socket: {} });
    const row = require("../lib/db").db.prepare("SELECT twofa_enabled FROM users WHERE id = ?").get(registered.userId);
    expect(row.twofa_enabled).toBe(0);
    const secret = new URL(setup.otpauthUri).searchParams.get("secret");
    const confirmed = identitySecurity.confirmTwoFactor(
      registered.userId,
      { code: totp.generateTotp(secret) },
      { headers: {}, socket: {} }
    );
    expect(confirmed.enrolled).toBe(true);
    const recovery = confirmed.recoveryCodes[0];
    expect(identitySecurity.consumeRecoveryCode(registered.userId, recovery)).toBe(true);
    expect(identitySecurity.consumeRecoveryCode(registered.userId, recovery)).toBe(false);
  });

  it("covers Human Approval Center deny paths including action mismatch", () => {
    const input = { sku: "FIN-1", price: 12 };
    const asked = pusat.approval.requestApproval({
      taskId: `task-final-${Date.now()}`,
      requestingAgent: "price_assistant",
      action: "prices.update",
      input,
      requiredApprover: "admin",
    });

    expect(pusat.approval.decide(asked.id, "approve", "read_only").code).toBe("approver_unauthorized");
    expect(pusat.approval.decide(asked.id, "approve", "order_ai").code).toBe("ai_cannot_self_approve");
    expect(pusat.approval.decide(asked.id, "approve", "esat_bey").code).toBe("ai_cannot_self_approve");

    const cancelled = pusat.approval.requestApproval({
      requestingAgent: "price_assistant",
      action: "prices.update",
      input: { sku: "FIN-CANCEL" },
    });
    const cancel = pusat.approval.cancel(cancelled.id, "admin@buzzard.de", "operator_cancel");
    expect(cancel.approval.status).toBe("CANCELLED");

    const rejected = pusat.approval.requestApproval({
      requestingAgent: "price_assistant",
      action: "prices.update",
      input: { sku: "FIN-REJ" },
    });
    expect(pusat.approval.decide(rejected.id, "reject", "admin@buzzard.de").approval.status).toBe("REJECTED");

    const human = pusat.approval.decide(asked.id, "approve", "admin@buzzard.de", { currentInput: input });
    expect(human.approval.status).toBe("APPROVED");
    const omitted = pusat.approval.consumeForExecution(asked.id, input, {
      actor: "admin@buzzard.de",
    });
    expect(omitted.ok).toBe(false);
    expect(omitted.code).toBe("action_required");
    const mismatched = pusat.approval.consumeForExecution(asked.id, input, {
      actor: "admin@buzzard.de",
      action: "payment.refund",
    });
    expect(mismatched.ok).toBe(false);
    expect(mismatched.code).toBe("action_mismatch");
    const consumed = pusat.approval.consumeForExecution(asked.id, input, {
      actor: "admin@buzzard.de",
      action: "prices.update",
    });
    expect(consumed.ok).toBe(true);
    expect(consumed.executed).toBe(false);
    const replay = pusat.approval.consumeForExecution(asked.id, input, {
      actor: "admin@buzzard.de",
      action: "prices.update",
    });
    expect(replay.code).toBe("already_executed");
    const failed = pusat.approval.markExecutionFailed(asked.id, { errorKey: "execution.failed" });
    expect(failed.status).toBe("EXECUTION_FAILED");
  });

  it("fails closed on circular payloads, open circuits, and approval outages", () => {
    const employee = { id: "esat_bey", status: "ACTIVE", permissions: ["security.read", "ai.execute"] };
    const circular = {};
    circular.self = circular;
    const boom = guardian.evaluate({
      agentId: "esat_bey",
      employee,
      action: "health.probe",
      payload: circular,
    });
    expect(boom.allowed).toBe(false);
    expect(boom.failClosed || boom.code).toBeTruthy();

    circuitBreaker.recordFailure("pusat:final-hardening");
    circuitBreaker.recordFailure("pusat:final-hardening");
    circuitBreaker.recordFailure("pusat:final-hardening");
    const open = circuitBreaker.allow("pusat:final-hardening");
    expect(open.allowed).toBe(false);
    expect(open.reason).toBe("CIRCUIT_OPEN");

    const down = esatSecurity.wrapApprovalCall(() => {
      throw new Error("hac down");
    });
    expect(down.allowed).toBe(false);
    expect(down.failClosed).toBe(true);
  });

  it("tracks local incident status without claiming live dispatch", () => {
    const first = esatSecurity.recordIncident({
      reason: "prompt_injection",
      actorId: "esat_bey",
      evidenceRef: "test",
    });
    expect(first.status).toBe("OPEN");
    expect(first.classification).toBe("suspicious");
    expect(first.dispatched).toBe(false);
    expect(first.deliveryBlocked).toBe(true);
    const reviewing = esatSecurity.transitionIncident(first.id, "REVIEWING", { actor: "admin@buzzard.de" });
    expect(reviewing.ok).toBe(true);
    const skip = esatSecurity.transitionIncident(first.id, "OPEN");
    expect(skip.ok).toBe(false);
    const resolved = esatSecurity.transitionIncident(first.id, "RESOLVED", { actor: "admin@buzzard.de" });
    expect(resolved.incident.status).toBe("RESOLVED");
    expect(resolved.liveSoc).toBe(false);
    expect(esatSecurity.getEsatHealth().siem).toBe(false);
  });
});
