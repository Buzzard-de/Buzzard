const { check } = require("../permissionEngine");

const BANNED_CLAIM = /(cerberus|iso\s*9001|lifetime warranty|%100 orijinal)/i;

function draft({ actorId = "seo_ai", titleFacts = [], lang = "de", existing = [] } = {}) {
  if (!check(actorId, "SEO_DRAFT").ok) return { ok: false, code: "PERMISSION_DENIED" };
  const facts = titleFacts.filter((t) => t && !BANNED_CLAIM.test(t));
  const invented = titleFacts.filter((t) => BANNED_CLAIM.test(t));
  const title = facts.slice(0, 8).join(" ").slice(0, 70);
  const meta = facts.join(". ").slice(0, 155);
  const dup = existing.includes(title);
  return {
    ok: true,
    lang,
    title,
    metaDescription: meta,
    keywords: facts.slice(0, 5),
    inventedClaimsRejected: invented,
    duplicate: dup,
    livePublish: false,
    schemaCheck: "NOT_IMPLEMENTED",
  };
}

function inventClaim() {
  return { ok: false, code: "SEO_INVENTED_CLAIM_DENIED" };
}

function livePublish() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "SEO_LIVE_PUBLISH" };
}

module.exports = { draft, inventClaim, livePublish };
