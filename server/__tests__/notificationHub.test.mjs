import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { deliverNotification, NOTIFICATION_CHANNELS } = require("../lib/notificationHub.js");
const software = require("../lib/software");

describe("notification delivery fail-closed", () => {
  it("does not mark external channels as delivered", () => {
    for (const channel of [
      NOTIFICATION_CHANNELS.EMAIL,
      NOTIFICATION_CHANNELS.SMS,
      NOTIFICATION_CHANNELS.PUSH,
      NOTIFICATION_CHANNELS.WHATSAPP,
      NOTIFICATION_CHANNELS.SLACK,
      NOTIFICATION_CHANNELS.TEAMS,
    ]) {
      const result = deliverNotification({ channel, body: "test" });
      expect(result.status).toBe("BLOCKED");
      expect(result.sent).toBe(false);
      expect(result.live).toBe(false);
      expect(result.deliveryResult).toContain("not_configured");
    }
  });

  it("keeps prepared customer sends blocked without a live provider", () => {
    const blocked = software.communications.sendPrepared(null, "missing-draft");
    expect(blocked.ok).toBe(false);
    expect(blocked.sent).toBe(false);
    expect(blocked.delivered).toBe(false);
    expect(blocked.live).toBe(false);
    expect(blocked.blocked).toBe(true);
  });
});
