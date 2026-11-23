import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

let api;
let adminToken;

beforeAll(async () => {
  api = await startIsolatedApi({ roles: ["administrator"] });
  adminToken = await api.login("administrator");
}, 60_000);

afterAll(async () => {
  await api?.stop();
});

describe("diagnostic GET prefixes", () => {
  it("refuses guardian, orchestrator and database status without a credential", async () => {
    for (const path of [
      "/api/guardian/status",
      "/api/guardian/health",
      "/api/orchestrator/status",
      "/api/orchestrator/agents",
      "/api/orchestrator/tasks",
      "/api/db/status",
    ]) {
      const res = await api.request("GET", path);
      expect(res.status, path).toBe(401);
    }
  });

  it("lets an admin session read guardian and orchestrator status, and keeps the liveness probe public", async () => {
    const guardian = await api.request("GET", "/api/guardian/status", { token: adminToken });
    const orchestrator = await api.request("GET", "/api/orchestrator/status", { token: adminToken });
    expect(guardian.status).toBe(200);
    expect(orchestrator.status).toBe(200);
    expect(guardian.json.configured).toBe(false);
    expect(orchestrator.json.configured).toBe(false);

    const health = await api.request("GET", "/api/health");
    expect(health.status).toBe(200);
  });

  it("lets a signed account read database status and rejects the admin session there", async () => {
    const adminOnDb = await api.request("GET", "/api/db/status", { token: adminToken });
    expect(adminOnDb.status).toBe(401);

    const registered = await api.request("POST", "/api/auth/register", {
      body: {
        email: `status-${randomBytes(4).toString("hex")}@isolated.example`,
        password: `Pw-${randomBytes(9).toString("base64url")}-4k`,
        name: "Isolated Status",
      },
    });
    const dbStatus = await api.request("GET", "/api/db/status", { token: registered.json.token });
    expect(dbStatus.status).toBe(200);
    expect(dbStatus.json.storage).toBe("sqlite");
  });
});
