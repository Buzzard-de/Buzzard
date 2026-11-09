import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { guardedScriptFetch } from "../../scripts/lib/guardedScriptFetch.mjs";

const require = createRequire(import.meta.url);
const { SHARED, evaluateEgress } = require("../lib/security/egressPolicy.js");
const { guardedFetch, resetEgressAudit, setDnsLookup } = require("../lib/security/egressGuard.js");
const { assertJobPayloadEgress } = require("../lib/jobEgressGate.js");
const { executeJob } = require("../lib/jobHandlers.js");
const { isForbiddenRuntimeBinary, LOCAL_BINARIES } = require("../lib/security/subprocessInventory.js");
const { assertNotPackageManager, RUNTIME_POLICY } = require("../lib/security/installTimeNetwork.js");

describe("egress hardening without policy change", () => {
  afterEach(() => {
    resetEgressAudit();
    setDnsLookup(null);
    delete process.env.BUZZARD_EGRESS_EXTRA_HOSTS;
    delete process.env.HTTP_PROXY;
  });

  it("keeps shared DENY, private/metadata/proxy/AI locks", () => {
    expect(SHARED.default).toBe("DENY");
    expect(evaluateEgress({ destinationUrl: "https://evil.example/" }).code).toBe("HOST_NOT_ALLOWLISTED");
    expect(evaluateEgress({ destinationUrl: "https://127.0.0.1/" }).allowed).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://169.254.169.254/" }).allowed).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed).toBe(false);
    process.env.HTTP_PROXY = "http://127.0.0.1:8080";
    expect(evaluateEgress({ destinationUrl: "https://api.anthropic.com/v1" }).code).toBe("EXTERNAL_AI_EGRESS_DENIED");
  });

  it("script helper denies without reaching the network", async () => {
    await expect(guardedScriptFetch("https://api.openai.com/v1")).rejects.toMatchObject({
      blocked: true,
      reachedNetwork: false,
    });
    const gated = await guardedFetch("https://example.com/");
    expect(gated.blocked).toBe(true);
    expect(gated.reachedNetwork).toBe(false);
  });

  it("background jobs with explicit outbound URLs are denied off-allowlist", async () => {
    const denied = assertJobPayloadEgress({ webhookUrl: "https://api.openai.com/v1" });
    expect(denied.ok).toBe(false);
    expect(denied.reachedNetwork).toBe(false);
    const local = assertJobPayloadEgress({ sku: "pad-1", title: "see https://example.com in docs" });
    expect(local.ok).toBe(true);
    await expect(
      executeJob({ id: "job_test", jobType: "part4_smoke_test", payload: { destinationUrl: "https://api.stripe.com/v1" } }),
    ).rejects.toMatchObject({ code: "JOB_EGRESS_DENIED" });
    const ok = await executeJob({ id: "job_ok", jobType: "part4_smoke_test", payload: { sku: "local" } });
    expect(ok).toEqual({ ok: true });
  });

  it("subprocess inventory does not treat git/nvidia-smi as network; npm/pip blocked at runtime", () => {
    expect(LOCAL_BINARIES.some((row) => row.binary === "git" && row.network === false)).toBe(true);
    expect(isForbiddenRuntimeBinary("curl")).toBe(true);
    expect(isForbiddenRuntimeBinary("npm")).toBe(true);
    expect(assertNotPackageManager("npm install foo").code).toBe("PACKAGE_MANAGER_RUNTIME_DENIED");
    expect(RUNTIME_POLICY.npmAtRuntime).toBe(false);
    expect(RUNTIME_POLICY.pipAtRuntime).toBe(false);
  });
});
