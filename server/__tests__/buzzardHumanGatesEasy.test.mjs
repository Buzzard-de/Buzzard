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

  it("item 73: Product SoT stays inactive even if env or forceActivate is set", () => {
    const software = require("../lib/software");
    const previous = process.env.BUZZARD_PRODUCT_SOT_ACTIVE;
    process.env.BUZZARD_PRODUCT_SOT_ACTIVE = "1";
    try {
      const reported = software.sotActivation.status();
      expect(reported.productSourceOfTruthActive).toBe(false);
      expect(reported.productSotEnvFlag).toBe(true);
      expect(reported.envDoesNotActivate).toBe(true);
      expect(reported.dualWrite).toBe(false);
      expect(reported.writeBoundaryActive).toBe(false);

      const ai = software.sotActivation.activate({ actor: "pusat", forceActivate: true });
      expect(ai.reason).toBe("SELF_APPROVE_DENIED");
      expect(ai.activated).toBe(false);
      expect(ai.productSourceOfTruthActive).toBe(false);

      const forced = software.sotActivation.activate({
        actor: "operator",
        forceActivate: true,
        envFlag: true,
      });
      expect(forced.reason).toBe("HUMAN_SOT_ACTIVATION_REQUIRED");
      expect(forced.forceActivateIgnored).toBe(true);
      expect(forced.envFlagIgnored).toBe(true);
      expect(forced.mutated).toBe(false);
      expect(forced.dualWrite).toBe(false);
      expect(forced.productSourceOfTruthActive).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.BUZZARD_PRODUCT_SOT_ACTIVE;
      else process.env.BUZZARD_PRODUCT_SOT_ACTIVE = previous;
    }
  });

  it("item 213: production env inspect is presence-only and apply does not mutate", () => {
    const software = require("../lib/software");
    const snapshot = { ...process.env };
    const seen = software.productionConfigGate.inspect();
    expect(seen.secretsIncluded).toBe(false);
    expect(seen.productionChanged).toBe(false);
    expect(seen.keys.every((row) => row.valueIncluded === false)).toBe(true);
    expect(seen.keys.some((row) => row.name === "JWT_SECRET")).toBe(true);

    const ai = software.productionConfigGate.apply({
      actor: "guardian",
      updates: { BUZZARD_SALES_ENABLED: "1" },
    });
    expect(ai.reason).toBe("SELF_APPROVE_DENIED");
    expect(ai.applied).toBe(false);
    expect(ai.processEnvMutated).toBe(false);

    const forced = software.productionConfigGate.apply({
      actor: "operator",
      forceApply: true,
      updates: { JWT_SECRET: "must-not-be-written" },
    });
    expect(forced.reason).toBe("HUMAN_PRODUCTION_CONFIG_REQUIRED");
    expect(forced.forceApplyIgnored).toBe(true);
    expect(forced.mutated).toBe(false);
    expect(forced.secretsIncluded).toBe(false);
    expect(process.env.JWT_SECRET).toBe(snapshot.JWT_SECRET);
    expect(process.env.BUZZARD_SALES_ENABLED).toBe(snapshot.BUZZARD_SALES_ENABLED);
  });

  it("item 214: deploy inspect is presence-only and trigger never calls a hook", () => {
    const software = require("../lib/software");
    const previousHook = process.env.RENDER_DEPLOY_HOOK_URL;
    process.env.RENDER_DEPLOY_HOOK_URL = "https://example.invalid/deploy-hook";
    try {
      const seen = software.productionDeployGate.inspect();
      expect(seen.deployHookPresent).toBe(true);
      expect(seen.hookUrlIncluded).toBe(false);
      expect(seen.secretsIncluded).toBe(false);
      expect(seen.deployed).toBe(false);
      expect(seen.hookCalled).toBe(false);

      const ai = software.productionDeployGate.trigger({ actor: "esat", forceDeploy: true });
      expect(ai.reason).toBe("SELF_APPROVE_DENIED");
      expect(ai.deployed).toBe(false);
      expect(ai.httpAttempted).toBe(false);

      const forced = software.productionDeployGate.trigger({
        actor: "operator",
        forceDeploy: true,
        hookUrl: process.env.RENDER_DEPLOY_HOOK_URL,
      });
      expect(forced.reason).toBe("HUMAN_DEPLOY_REQUIRED");
      expect(forced.forceDeployIgnored).toBe(true);
      expect(forced.hookPresentIgnored).toBe(true);
      expect(forced.hookCalled).toBe(false);
      expect(forced.httpAttempted).toBe(false);
      expect(forced.hookUrlIncluded).toBe(false);
    } finally {
      if (previousHook === undefined) delete process.env.RENDER_DEPLOY_HOOK_URL;
      else process.env.RENDER_DEPLOY_HOOK_URL = previousHook;
    }
  });

  it("item 219: go-live software gate does not approve or enable sales", () => {
    const software = require("../lib/software");
    const goLiveApproval = require("../lib/commerce/goLiveApproval");
    const salesBefore = process.env.BUZZARD_SALES_ENABLED;

    const ai = software.goLiveGate.approve({ actor: "pusat", forceApprove: true });
    expect(ai.reason).toBe("SELF_APPROVE_DENIED");
    expect(ai.approved).toBe(false);
    expect(ai.salesEnabled).toBe(false);
    expect(ai.mutated).toBe(false);

    const human = software.goLiveGate.approve({ actor: "operator", forceApprove: true });
    expect(human.reason).toBe("HUMAN_GO_LIVE_REQUIRED");
    expect(human.forceApproveIgnored).toBe(true);
    expect(human.executed).toBe(false);
    expect(human.salesEnabled).toBe(false);

    const sales = software.goLiveGate.activateSales({ actor: "operator" });
    expect(sales.allowed).toBe(false);
    expect(sales.salesEnabled).toBe(false);
    expect(sales.reason).toBe("HUMAN_SALES_ACTIVATION_REQUIRED");

    const commerceAi = goLiveApproval.approveGoLive({ requestId: "gl_unused", decidedBy: "guardian" });
    expect(commerceAi.reason).toBe("SELF_APPROVE_DENIED");
    expect(commerceAi.salesEnabled).toBe(false);
    expect(commerceAi.executed).toBe(false);
    expect(goLiveApproval.canActivateSales().allowed).toBe(false);
    expect(process.env.BUZZARD_SALES_ENABLED).toBe(salesBefore);
  });

  it("item 221: DNS and access policy inspect is presence-only and apply does not write", () => {
    const software = require("../lib/software");
    const previous = process.env.CLOUDFLARE_API_TOKEN;
    process.env.CLOUDFLARE_API_TOKEN = "must-not-be-used";
    try {
      const seen = software.dnsAccessGate.inspect();
      expect(seen.cloudflareTokenPresent).toBe(true);
      expect(seen.secretsIncluded).toBe(false);
      expect(seen.zoneIdIncluded).toBe(false);
      expect(seen.dnsChanged).toBe(false);
      expect(seen.httpAttempted).toBe(false);

      const ai = software.dnsAccessGate.applyDnsRecord({
        actor: "orchestrator",
        forceApply: true,
        name: "buzzard.de",
      });
      expect(ai.reason).toBe("SELF_APPROVE_DENIED");
      expect(ai.dnsChanged).toBe(false);
      expect(ai.httpAttempted).toBe(false);

      const dns = software.dnsAccessGate.applyDnsRecord({
        actor: "operator",
        forceApply: true,
        name: "buzzard.de",
      });
      expect(dns.reason).toBe("HUMAN_DNS_CHANGE_REQUIRED");
      expect(dns.forceApplyIgnored).toBe(true);
      expect(dns.dnsChanged).toBe(false);

      const policy = software.dnsAccessGate.applyAccessPolicy({ actor: "operator", forceApply: true });
      expect(policy.reason).toBe("HUMAN_ACCESS_POLICY_REQUIRED");
      expect(policy.accessPolicyChanged).toBe(false);
      expect(policy.httpAttempted).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
      else process.env.CLOUDFLARE_API_TOKEN = previous;
    }
  });

  it("item 225: first real customer order is not placed", () => {
    const software = require("../lib/software");
    const salesBefore = process.env.BUZZARD_SALES_ENABLED;
    const seen = software.firstOrderGate.inspect();
    expect(seen.firstOrderPlaced).toBe(false);
    expect(seen.commercialCreated).toBe(false);
    expect(seen.charged).toBe(false);
    expect(seen.salesEnabled).toBe(false);

    const ai = software.firstOrderGate.place({ actor: "pusat", forcePlace: true, sku: "SKU-1" });
    expect(ai.reason).toBe("SELF_APPROVE_DENIED");
    expect(ai.orderId).toBe(null);
    expect(ai.commercialCreated).toBe(false);

    const forced = software.firstOrderGate.place({
      actor: "operator",
      forcePlace: true,
      sku: "SKU-1",
      customerId: "cust-1",
    });
    expect(forced.reason).toBe("HUMAN_FIRST_ORDER_REQUIRED");
    expect(forced.forcePlaceIgnored).toBe(true);
    expect(forced.orderId).toBe(null);
    expect(forced.charged).toBe(false);
    expect(forced.fulfilled).toBe(false);
    expect(forced.salesEnabled).toBe(false);
    expect(process.env.BUZZARD_SALES_ENABLED).toBe(salesBefore);
  });

  it("item 226: protected-branch merge is not executed", () => {
    const software = require("../lib/software");
    const seen = software.protectedBranchMergeGate.inspect({
      branch: "cursor/software-completion-local-c293",
      target: "main",
      prNumber: 431,
    });
    expect(seen.merged).toBe(false);
    expect(seen.gitExecuted).toBe(false);
    expect(seen.ghExecuted).toBe(false);
    expect(seen.protectedTarget).toBe(true);
    expect(seen.prNumber).toBe(431);

    const ai = software.protectedBranchMergeGate.merge({
      actor: "guardian",
      forceMerge: true,
      target: "main",
      prNumber: 431,
    });
    expect(ai.reason).toBe("SELF_APPROVE_DENIED");
    expect(ai.merged).toBe(false);
    expect(ai.gitExecuted).toBe(false);

    const forced = software.protectedBranchMergeGate.merge({
      actor: "operator",
      forceMerge: true,
      target: "main",
      prNumber: 431,
    });
    expect(forced.reason).toBe("HUMAN_PROTECTED_MERGE_REQUIRED");
    expect(forced.forceMergeIgnored).toBe(true);
    expect(forced.merged).toBe(false);
    expect(forced.ghExecuted).toBe(false);
  });
});
