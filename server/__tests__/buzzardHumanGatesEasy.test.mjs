import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import Database from "better-sqlite3";

const require = createRequire(import.meta.url);

function memoryDb() {
  const db = new Database(":memory:");
  require("../lib/software").initialize(db);
  return db;
}

describe("easiest remaining human gates — 165/182/67/129", () => {
  it("item 165: unknown channel is not a live send", () => {
    const software = require("../lib/software");
    const db = memoryDb();
    const sms = software.communications.draft(db, {
      channel: "sms",
      message: "Track my order",
    });
    expect(sms.ok).toBe(false);
    expect(sms.sent).toBe(false);
    expect(sms.reason).toBe("CHANNEL_NOT_ALLOWED");

    const draft = software.communications.draft(db, {
      channel: "email",
      message: "Track my order",
    });
    expect(draft.ok).toBe(true);
    expect(draft.sent).toBe(false);
    const queued = software.communications.queue(db, draft.draft.id);
    expect(queued.status).toBe("QUEUED");
    expect(queued.sent).toBe(false);
    expect(queued.live).toBe(false);
    const again = software.communications.queue(db, draft.draft.id);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe("NOT_DRAFT");
    const marked = software.communications.markSentOrDelivered();
    expect(marked.ok).toBe(false);
    expect(marked.reason).toBe("HUMAN_SEND_REQUIRED");
    db.close();
  });

  it("item 182: catalog refuses AI self-approve and never executes", () => {
    const software = require("../lib/software");
    const listed = software.gatedActions.catalog();
    expect(listed.length).toBeGreaterThanOrEqual(8);
    expect(listed.every((row) => row.executed === false && row.requiresHuman === true)).toBe(true);

    const ai = software.gatedActions.execute({ action: "sales_enable", actor: "pusat" });
    expect(ai.reason).toBe("SELF_APPROVE_DENIED");
    expect(ai.executed).toBe(false);
    expect(ai.live).toBe(false);

    const humanShaped = software.gatedActions.execute({
      action: "marketplace_live_listing",
      actor: "operator",
    });
    expect(humanShaped.reason).toBe("HUMAN_APPROVAL_REQUIRED");
    expect(humanShaped.executed).toBe(false);
    expect(humanShaped.sideEffect).toBe(false);

    const unknown = software.gatedActions.evaluate({ action: "invented_action" });
    expect(unknown.reason).toBe("UNKNOWN_GATED_ACTION");
  });

  it("item 67: live PIM publish does not mutate", () => {
    const software = require("../lib/software");
    const ai = software.pimPublish.livePublish({ sku: "SKU-1", actorId: "pusat" });
    expect(ai.reason).toBe("SELF_APPROVE_DENIED");
    expect(ai.mutated).toBe(false);
    expect(ai.live).toBe(false);
    const forced = software.pimPublish.livePublish({ sku: "SKU-1", actorId: "operator", forceLive: true });
    expect(forced.reason).toBe("HUMAN_PUBLISH_REQUIRED");
    expect(forced.forceLiveIgnored).toBe(true);
    expect(forced.mutated).toBe(false);
    expect(forced.salesWouldChange).toBe(false);
  });

  it("item 129: listing approval never writes a live listing", () => {
    const software = require("../lib/software");
    const published = software.marketplace.publishListing({
      channel: "amazon",
      sku: "A",
      price: 10,
      forcePublish: true,
    });
    expect(published.reason).toBe("PUBLISH_BLOCKED");
    expect(published.forcePublishIgnored).toBe(true);
    expect(published.listingId).toBe(null);
    const ai = software.marketplace.approvePublish({ actor: "guardian" });
    expect(ai.reason).toBe("SELF_APPROVE_DENIED");
    expect(ai.published).toBe(false);
    const human = software.marketplace.approvePublish({ actor: "operator" });
    expect(human.reason).toBe("HUMAN_LISTING_APPROVAL_REQUIRED");
    expect(human.executed).toBe(false);
    expect(human.live).toBe(false);
  });

  it("item 115: listing model stays draft; vendor ids and activate are refused", () => {
    const software = require("../lib/software");
    const rejected = software.marketplace.draftListing({
      channel: "amazon",
      sku: "SKU-115",
      price: 12,
      listingId: "amzn-live-1",
    });
    expect(rejected.ok).toBe(false);
    expect(rejected.reason).toBe("VENDOR_LISTING_ID_REJECTED");
    expect(rejected.listingId).toBe(null);
    expect(rejected.published).toBe(false);
    expect(rejected.live).toBe(false);

    const mapped = software.marketplace.mapCategory({
      channel: "amazon",
      sourceCategory: "bremsen",
      marketplaceCategoryId: "auto-invented",
    });
    expect(mapped.mapped).toBe(false);
    expect(mapped.invented).toBe(false);
    expect(mapped.marketplaceCategoryId).toBe(null);
    expect(mapped.vendorCategoryIdIgnored).toBe(true);

    const activated = software.marketplace.activateDraft({ draftId: "smd_local" });
    expect(activated.ok).toBe(false);
    expect(activated.activated).toBe(false);
    expect(activated.reason).toBe("LISTING_ACTIVATE_BLOCKED");
    expect(activated.listingId).toBe(null);
    expect(activated.status).toBe("DRAFT");

    const adapter = software.marketplace.createSafeAdapter("amazon");
    const adapterActivate = adapter.activate({ draftId: "smd_local" });
    expect(adapterActivate.reason).toBe("LISTING_ACTIVATE_BLOCKED");
    expect(adapterActivate.live).toBe(false);
  });

  it("item 155: notifications stay drafted; provider ids and approve do not send", () => {
    const software = require("../lib/software");
    const db = memoryDb();
    const rejected = software.communications.draft(db, {
      channel: "email",
      message: "Where is my order?",
      providerMessageId: "smtp-live-1",
    });
    expect(rejected.ok).toBe(false);
    expect(rejected.reason).toBe("PROVIDER_MESSAGE_ID_REJECTED");
    expect(rejected.sent).toBe(false);
    expect(rejected.live).toBe(false);

    const drafted = software.communications.draft(db, {
      channel: "email",
      message: "Where is my order?",
    });
    expect(drafted.ok).toBe(true);
    expect(drafted.sent).toBe(false);
    const sent = software.communications.sendPrepared(db, drafted.draft.id, {
      providerMessageId: "smtp-live-1",
    });
    expect(sent.sent).toBe(false);
    expect(sent.providerAccepted).toBe(false);
    expect(sent.providerMessageIdIgnored).toBe(true);
    expect(sent.blocked).toBe(true);

    const ai = software.communications.approveSend({ actor: "orchestrator" });
    expect(ai.reason).toBe("SELF_APPROVE_DENIED");
    expect(ai.sent).toBe(false);
    const human = software.communications.approveSend({ actor: "operator" });
    expect(human.reason).toBe("HUMAN_SEND_REQUIRED");
    expect(human.executed).toBe(false);
    expect(human.live).toBe(false);

    const accepted = software.communications.recordProviderAccepted();
    expect(accepted.reason).toBe("PROVIDER_ACCEPT_BLOCKED");
    expect(accepted.providerAccepted).toBe(false);
    db.close();
  });
});
