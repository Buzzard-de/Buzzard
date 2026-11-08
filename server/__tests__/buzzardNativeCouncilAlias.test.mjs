import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  NATIVE_SEED_IDS,
  OFFICIAL_DISPLAY_NAMES,
  LEGACY_ALIAS_TO_NATIVE,
  GENERIC_LABELS_FORBIDDEN_IN_UI,
  resolveIdentity,
} = require("../lib/buzzardNative/core/councilAliasMap.js");
const { ids, getAgent, SEED_IDS, ORIGINAL_10_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");
const { createMultiMemory } = require("../lib/buzzardNative/core/multiMemory.js");
const { check, DANGEROUS } = require("../lib/buzzardNative/core/permissionEngine.js");
const { createRouter } = require("../lib/buzzardNative/core/taskRouter.js");
const { MEMBERS, getMember } = require("../lib/pusat/council.js");
const { SHARED } = require("../lib/security/egressPolicy.js");

describe("17-agent official names and alias compatibility", () => {
  it("keeps 17 native IDs and SEED_IDS unchanged", () => {
    expect(ids()).toEqual([...NATIVE_SEED_IDS]);
    expect(SEED_IDS).toEqual([...NATIVE_SEED_IDS]);
    expect(ORIGINAL_10_IDS).toHaveLength(10);
    expect(getAgent("customs_ai")).toBeNull();
    expect(getAgent("phone_ai")).toBeNull();
    expect(getAgent("price_ai")).toBeNull();
    expect(getAgent("customer_ai")).toBeNull();
    expect(getAgent("tuncay_bey").agent_id).toBe("tuncay_bey");
    expect(getAgent("zeynep_hanim").agent_id).toBe("zeynep_hanim");
    expect(getAgent("pricing_ai").agent_id).toBe("pricing_ai");
    expect(getAgent("banu_hanim").agent_id).toBe("banu_hanim");
  });

  it("uses official Turkish display names, not generic UI labels", () => {
    expect(OFFICIAL_DISPLAY_NAMES).toEqual({
      pusat: "Pusat",
      sinan_bey: "Sinan Bey",
      esat_bey: "Esat Bey",
      dogu_bey: "Doğu Bey",
      nedim_bey: "Nedim Bey",
      tuncay_bey: "Tuncay Bey",
      amelia: "Amelia",
      adrian: "Adrian",
      mira: "Mira",
      leon: "Leon",
      stock_ai: "Çakır Bey",
      category_ai: "Pelin Hanım",
      pricing_ai: "Akın Bey",
      seo_ai: "Yılmaz Bey",
      banu_hanim: "Banu Hanım",
      sales_analysis_ai: "Sencer Bey",
      zeynep_hanim: "Zeynep Hanım",
    });
    for (const id of ids()) {
      expect(getAgent(id).display_name).toBe(OFFICIAL_DISPLAY_NAMES[id]);
      expect(GENERIC_LABELS_FORBIDDEN_IN_UI).not.toContain(getAgent(id).display_name);
    }
    expect(getMember("customs_ai").name).toBe("Tuncay Bey");
    expect(getMember("phone_ai").name).toBe("Zeynep Hanım");
    expect(getMember("price_ai").name).toBe("Akın Bey");
    expect(getMember("customer_ai").name).toBe("Banu Hanım");
    expect(getMember("stock_ai").name).toBe("Çakır Bey");
    expect(getMember("seo_ai").name).toBe("Yılmaz Bey");
    expect(getMember("sales_analysis_ai").name).toBe("Sencer Bey");
    expect(MEMBERS.some((m) => m.id === "tuncay_bey")).toBe(false);
    expect(MEMBERS.some((m) => m.id === "customs_ai")).toBe(true);
    expect(getMember("customs_ai").identitiesMerged).toBe(false);
  });

  it("resolves legacy aliases without merging memory or unknown ids", () => {
    expect(LEGACY_ALIAS_TO_NATIVE).toEqual({
      customs_ai: "tuncay_bey",
      phone_ai: "zeynep_hanim",
      price_ai: "pricing_ai",
      customer_ai: "banu_hanim",
    });
    expect(resolveIdentity("customs_ai")).toMatchObject({
      ok: true,
      nativeId: "tuncay_bey",
      kind: "LEGACY_ALIAS",
      identitiesMerged: false,
      memoryOwnerId: "customs_ai",
      displayName: "Tuncay Bey",
    });
    expect(resolveIdentity("phone_ai").nativeId).toBe("zeynep_hanim");
    expect(resolveIdentity("price_ai").nativeId).toBe("pricing_ai");
    expect(resolveIdentity("customer_ai").nativeId).toBe("banu_hanim");
    expect(resolveIdentity("stock_ai")).toMatchObject({ ok: true, kind: "NATIVE", nativeId: "stock_ai" });
    expect(resolveIdentity("finance_ai").code).toBe("NOT_NATIVE_SEED");
    expect(resolveIdentity("nesrin_hanim").code).toBe("NOT_NATIVE_SEED");
    expect(resolveIdentity("not_an_agent").code).toBe("UNKNOWN_IDENTITY");
    expect(resolveIdentity("").code).toBe("UNKNOWN_IDENTITY");
    expect(resolveIdentity("openai").ok).toBe(false);
  });

  it("keeps memory isolation across alias and native ids", () => {
    const mem = createMultiMemory();
    expect(mem.put({ actorId: "tuncay_bey", ownerId: "tuncay_bey", type: "hs_cn_taric", key: "k", value: "native" }).ok).toBe(
      true,
    );
    expect(
      mem.get({ actorId: "customs_ai", ownerId: "tuncay_bey", type: "hs_cn_taric", key: "k" }).code,
    ).toBe("MEMORY_ISOLATION_DENIED");
    expect(mem.put({ actorId: "banu_hanim", ownerId: "banu_hanim", type: "personal", key: "p", value: 1 }).ok).toBe(true);
    expect(mem.get({ actorId: "customer_ai", ownerId: "banu_hanim", type: "personal", key: "p" }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
    expect(mem.get({ actorId: "price_ai", ownerId: "pricing_ai", type: "personal", key: "p" }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
  });

  it("preserves permission gates when called with aliases", () => {
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
    }
    const router = createRouter();
    const t = router.create({ title: "alias-route", fromId: "pusat" });
    const assigned = router.assign({ taskId: t.task.id, agentId: "customs_ai" });
    expect(assigned.ok).toBe(true);
    expect(assigned.task.assignees).toEqual(["tuncay_bey"]);
    expect(assigned.identitiesMerged).toBe(false);
    expect(router.assign({ taskId: t.task.id, agentId: "not_an_agent" }).code).toBe("UNKNOWN_AGENT");
    expect(router.assign({ taskId: t.task.id, agentId: "nesrin_hanim" }).code).toBe("NOT_NATIVE_SEED");
    expect(SHARED.default).toBe("DENY");
  });
});
