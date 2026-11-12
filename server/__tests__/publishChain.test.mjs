import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createNativeRuntime } = require("../lib/buzzardNative/runtimeCore.js");
const { createRealtimeEngine } = require("../lib/buzzardNative/engines/realtime.js");
const events = require("../lib/eventBus.js");
const exceptions = require("../lib/exceptionBus.js");
const controlCenter = require("../lib/controlCenter.js");
const { db } = require("../lib/db");

describe("in-process publish is not a customer delivery", () => {
  it("keeps an engine reply off the sent and confirmed states", () => {
    const rt = createNativeRuntime();
    const pub = rt.publish({
      fromId: "thinking",
      toId: "speech",
      topic: "reply",
      body: "x",
      classification: "shared",
      sent: true,
      delivered: true,
      acknowledged: true,
      live: true,
    });
    expect(pub.message.fromEngine).toBe("thinking");
    expect(pub.message.classification).toBe("shared");
    expect(pub.queued).toBe(false);
    expect(pub.sent).toBe(false);
    expect(pub.deliveryConfirmed).toBe(false);
    expect(pub.customerNotified).toBe(false);
    expect(pub.status).toBe("UNKNOWN");
    expect(pub.code).toBe("IN_PROCESS_NOT_DELIVERY");
    expect(pub.callerFlagIgnored).toBe(true);
    expect(JSON.stringify(pub)).not.toContain("DELIVERED");
    expect(rt.audit.at(-1).result).toBe("blocked");
  });

  it("blocks provider topics and does not repeat a timed-out publish", () => {
    const rt = createNativeRuntime();
    const blocked = rt.publish({
      fromId: "thinking",
      toId: "speech",
      topic: "delivery",
      body: { email: "buyer@example.com", card: "4242424242424242" },
      taskId: "pub-delivery-1",
      mock: true,
    });
    expect(blocked.status).toBe("BLOCKED_EXTERNAL");
    expect(blocked.code).toBe("MOCK_NOT_LIVE");
    expect(blocked.message.body.email).toBe("[redacted]");
    expect(JSON.stringify(blocked.message)).not.toContain("buyer@example.com");
    expect(JSON.stringify(rt.audit.at(-1))).not.toContain("buyer@example.com");

    const timeout = rt.publish({ fromId: "a", toId: "b", topic: "order", taskId: "pub-timeout", timeout: true });
    const again = rt.publish({ fromId: "a", toId: "b", topic: "order", taskId: "pub-timeout", timeout: true });
    expect(timeout.status).toBe("FAILED");
    expect(timeout.code).toBe("TIMEOUT");
    expect(timeout.sent).toBe(false);
    expect(again.code).toBe("DUPLICATE_EVENT");
    expect(rt.bus.filter((row) => row.taskId === "pub-timeout")).toHaveLength(1);

    const down = rt.publish({ fromId: "a", toId: "b", topic: "refund", networkError: true, idempotencyKey: "net-1" });
    expect(down.code).toBe("NETWORK_ERROR");
    expect(down.commercial).toBe(false);
  });

  it("does not turn a bus row, an exception, or an admin notice into a sent event", () => {
    const key = `evt-publish-${Date.now()}`;
    const before = db.prepare("SELECT COUNT(*) n FROM system_events").get().n;
    const first = events.emit({
      type: events.TYPES.OrderPrepared,
      idempotencyKey: key,
      aggregateId: "ordprep_publish",
      aggregateType: "order",
      payload: { id: "ordprep_publish", email: "buyer@example.com" },
      timeout: true,
    });
    const second = events.emit({
      type: events.TYPES.OrderPrepared,
      idempotencyKey: key,
      aggregateId: "ordprep_publish",
      aggregateType: "order",
    });
    expect(first.duplicate).toBe(false);
    expect(first.aggregateType).toBe("order");
    expect(first.commercial).toBe(false);
    expect(first.status).toBe("FAILED");
    expect(first.code).toBe("TIMEOUT");
    expect(first.sent).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.stored).toBe(false);
    expect(db.prepare("SELECT COUNT(*) n FROM system_events").get().n).toBe(before + 1);
    const stored = db.prepare("SELECT payload_json FROM system_events WHERE id = ?").get(key);
    expect(stored.payload_json).not.toContain("buyer@example.com");

    const ex = exceptions.emit({
      type: exceptions.TYPES.REFUND_FAILED,
      message: "refund blocked",
      context: { email: "buyer@example.com", amount: 10 },
    });
    expect(ex.status).toBe("OPEN");
    const row = db.prepare("SELECT context_json FROM system_exceptions WHERE id = ?").get(ex.id);
    expect(row.context_json).not.toContain("buyer@example.com");

    const notes = db.prepare("SELECT COUNT(*) n FROM core_notifications").get().n;
    const notice = controlCenter.createNotification({
      eventType: "order.shipped",
      recipient: "buyer@example.com",
      channel: "email",
    });
    expect(notice.status).toBe("BLOCKED_EXTERNAL");
    expect(notice.sent).toBe(false);
    expect(notice.queued).toBe(false);
    expect(db.prepare("SELECT COUNT(*) n FROM core_notifications").get().n).toBe(notes);

    const engine = createRealtimeEngine();
    engine.initialize();
    const message = engine.execute({ op: "message" });
    expect(message.delivered).toBe(false);
    expect(message.customerNotified).toBe(false);
    expect(message.status).toBe("UNKNOWN");
  });
});
