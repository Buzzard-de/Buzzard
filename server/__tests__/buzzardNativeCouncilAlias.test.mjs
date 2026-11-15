import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  NATIVE_SEED_IDS,
  OFFICIAL_DISPLAY_NAMES,
  LEGACY_ALIAS_TO_NATIVE,
  GENERIC_LABELS_FORBIDDEN_IN_UI,
  resolveIdentity,
} = require("../lib/buzzardNative/core/councilAliasMap.js");
const {
  ids,
  getAgent,
  getAgentExact,
  resolveAgentInput,
  SEED_IDS,
  ORIGINAL_10_IDS,
  registerAgent,
  unregisterAgent,
} = require("../lib/buzzardNative/core/identityRegistry.js");
const { createMultiMemory } = require("../lib/buzzardNative/core/multiMemory.js");
const { check, DANGEROUS } = require("../lib/buzzardNative/core/permissionEngine.js");
const { createRouter } = require("../lib/buzzardNative/core/taskRouter.js");
const { MEMBERS, getMember, resolveMember } = require("../lib/pusat/council.js");
const { SHARED } = require("../lib/security/egressPolicy.js");

describe("17-agent official names and alias compatibility", () => {
  afterEach(() => {
    unregisterAgent("probe_ai");
  });

  it("1 getAgent: aliases resolve to native without merging registry rows", () => {
    expect(ids()).toEqual([...NATIVE_SEED_IDS]);
    expect(SEED_IDS).toEqual([...NATIVE_SEED_IDS]);
    expect(ORIGINAL_10_IDS).toHaveLength(10);
    expect(getAgentExact("customs_ai")).toBeNull();
    expect(getAgent("customs_ai").agent_id).toBe("tuncay_bey");
    expect(getAgent("customs_ai").requestedId).toBe("customs_ai");
    expect(getAgent("customs_ai").resolvedFromAlias).toBe(true);
    expect(getAgent("customs_ai").identitiesMerged).toBe(false);
    expect(getAgent("customs_ai").memoryOwnerId).toBe("customs_ai");
    expect(getAgent("phone_ai").agent_id).toBe("zeynep_hanim");
    expect(getAgent("price_ai").agent_id).toBe("pricing_ai");
    expect(getAgent("customer_ai").agent_id).toBe("banu_hanim");
    expect(getAgent("tuncay_bey").agent_id).toBe("tuncay_bey");
    expect(getAgent("tuncay_bey").resolvedFromAlias).toBe(false);
    expect(getAgent("ghost")).toBeNull();
  });

  it("2 registerAgent: aliases and seeds stay reserved", () => {
    expect(registerAgent({ agent_id: "customs_ai", display_name: "X", role: "y" }).code).toBe("ALIAS_RESERVED");
    expect(registerAgent({ agent_id: "phone_ai", display_name: "X", role: "y" }).code).toBe("ALIAS_RESERVED");
    expect(unregisterAgent("customs_ai").code).toBe("ALIAS_RESERVED");
    expect(unregisterAgent("tuncay_bey").code).toBe("SEED_IDENTITY_LOCKED");
    expect(ids()).toHaveLength(17);
  });

  it("3-4 task assignment and routing keep requested alias and native id", () => {
    const router = createRouter();
    const t = router.create({ title: "alias-route", fromId: "pusat" });
    const assigned = router.assign({ taskId: t.task.id, agentId: "customs_ai" });
    expect(assigned.ok).toBe(true);
    expect(assigned.requestedId).toBe("customs_ai");
    expect(assigned.nativeId).toBe("tuncay_bey");
    expect(assigned.task.assignees).toEqual(["tuncay_bey"]);
    expect(assigned.task.aliasRequests[0]).toMatchObject({ alias: "customs_ai", nativeId: "tuncay_bey", identitiesMerged: false });
    const ran = router.runAssigned(t.task.id);
    expect(ran.task.assignees).toEqual(["tuncay_bey"]);
    expect(ran.completed).toBe(false);
    expect(router.assign({ taskId: t.task.id, agentId: "not_an_agent" }).code).toBe("UNKNOWN_AGENT");
    expect(router.assign({ taskId: t.task.id, agentId: "nesrin_hanim" }).code).toBe("NOT_NATIVE_SEED");
  });

  it("5 permission checks via alias do not expand gates", () => {
    expect(check("customs_ai", "CUSTOMS_READ").ok).toBe(true);
    expect(check("customs_ai", "CUSTOMS_FILE_DECLARATION").code).toBe("HUMAN_GATE_REQUIRED");
    expect(check("phone_ai", "PHONE_LIVE_CALL").code).toBe("HUMAN_GATE_REQUIRED");
    expect(check("price_ai", "PRICE_PUBLISH_LIVE").code).toBe("HUMAN_GATE_REQUIRED");
    expect(check("customer_ai", "CUSTOMER_REFUND").code).toBe("HUMAN_GATE_REQUIRED");
    expect(check("stock_ai", "STOCK_BUY").code).toBe("HUMAN_GATE_REQUIRED");
    expect(check("ghost_ai", "STOCK_READ").code).toBe("UNKNOWN_IDENTITY");
    expect(check("finance_ai", "TAX_READ").code).toBe("NOT_NATIVE_SEED");
    for (const perm of DANGEROUS) {
      expect(check("tuncay_bey", perm).ok).toBe(false);
      expect(check("customs_ai", perm).ok).toBe(false);
    }
  });

  it("6 memory lookup: alias namespace stays separate from native", () => {
    const mem = createMultiMemory();
    expect(mem.put({ actorId: "tuncay_bey", ownerId: "tuncay_bey", type: "hs_cn_taric", key: "k", value: "native" }).ok).toBe(
      true,
    );
    expect(mem.get({ actorId: "customs_ai", ownerId: "tuncay_bey", type: "hs_cn_taric", key: "k" }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
    expect(mem.put({ actorId: "customs_ai", ownerId: "customs_ai", type: "hs_cn_taric", key: "k", value: "alias" }).ok).toBe(
      true,
    );
    expect(mem.get({ actorId: "tuncay_bey", ownerId: "customs_ai", type: "hs_cn_taric", key: "k" }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
    expect(mem.get({ actorId: "customs_ai", ownerId: "customs_ai", type: "hs_cn_taric", key: "k" }).value).toBe("alias");
    expect(mem.get({ actorId: "tuncay_bey", ownerId: "tuncay_bey", type: "hs_cn_taric", key: "k" }).value).toBe("native");
    expect(mem.put({ actorId: "phone_ai", ownerId: "zeynep_hanim", type: "personal", key: "p", value: 1 }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
  });

  it("7 council membership: MEMBERS rows stay dual, native ids not merged in", () => {
    expect(getMember("tuncay_bey")).toBeNull();
    expect(getMember("customs_ai").id).toBe("customs_ai");
    expect(resolveMember("customs_ai")).toMatchObject({
      ok: true,
      nativeId: "tuncay_bey",
      identitiesMerged: false,
    });
    expect(resolveMember("tuncay_bey").aliasMember.id).toBe("customs_ai");
    expect(resolveMember("tuncay_bey").member).toBeNull();
    expect(MEMBERS.some((m) => m.id === "tuncay_bey")).toBe(false);
  });

  it("8-10 reporting, API input, error handling", () => {
    expect(resolveAgentInput("price_ai")).toMatchObject({
      ok: true,
      requestedId: "price_ai",
      nativeId: "pricing_ai",
      displayName: "Akın Bey",
      identitiesMerged: false,
    });
    expect(resolveAgentInput("unknown_bot").code).toBe("UNKNOWN_IDENTITY");
    expect(resolveAgentInput("finance_ai").code).toBe("NOT_NATIVE_SEED");
    expect(LEGACY_ALIAS_TO_NATIVE.customer_ai).toBe("banu_hanim");
    for (const id of ids()) {
      expect(getAgent(id).display_name).toBe(OFFICIAL_DISPLAY_NAMES[id]);
      expect(GENERIC_LABELS_FORBIDDEN_IN_UI).not.toContain(getAgent(id).display_name);
    }
    expect(SHARED.default).toBe("DENY");
    expect(resolveIdentity("openai").ok).toBe(false);
  });
});
