import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { querySecurityEvents, inferSeverity, EVENT_SEVERITY } = require("../lib/securityLog");

describe("securityLog", () => {
  it("infers severity for known event types", () => {
    expect(inferSeverity("permission_denied")).toBe("WARNING");
    expect(inferSeverity("csrf_failure")).toBe("HIGH");
    expect(inferSeverity("privilege_escalation_attempt")).toBe("CRITICAL");
  });

  it("querySecurityEvents paginates", () => {
    const result = querySecurityEvents({ limit: 10, page: 1 });
    expect(result).toHaveProperty("events");
    expect(result).toHaveProperty("pagination");
    expect(Array.isArray(result.events)).toBe(true);
    expect(result.pagination.limit).toBeLessThanOrEqual(200);
  });

  it("EVENT_SEVERITY map includes Part 4 events", () => {
    expect(EVENT_SEVERITY.session_revoked).toBe("INFO");
    expect(EVENT_SEVERITY.ai_permission_violation).toBe("HIGH");
  });
});
