/**
 * Item 221 — live DNS and access policy stay human-gated.
 * Presence-only inspect. Never calls a DNS or access-policy API.
 */

const AI_ACTORS = new Set(["pusat", "guardian", "orchestrator", "esat", "agent", "ai"]);

function inspect(env = process.env) {
  return {
    ok: true,
    live: false,
    mutated: false,
    dnsChanged: false,
    accessPolicyChanged: false,
    httpAttempted: false,
    secretsIncluded: false,
    zoneIdIncluded: false,
    cloudflareTokenPresent: Boolean(env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN),
    dnsProviderPresent: Boolean(env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN || env.DNS_API_TOKEN),
    note: "Presence-only. Token present ≠ DNS write. Item 221.",
  };
}

function refuse(input, reasonIfHuman) {
  const actor = String(input.actorId || input.actor || input.approver || "").trim().toLowerCase();
  if (AI_ACTORS.has(actor)) {
    return {
      ok: false,
      mutated: false,
      live: false,
      dnsChanged: false,
      accessPolicyChanged: false,
      httpAttempted: false,
      secretsIncluded: false,
      zoneIdIncluded: false,
      reason: "SELF_APPROVE_DENIED",
      actor,
    };
  }
  return {
    ok: false,
    mutated: false,
    live: false,
    dnsChanged: false,
    accessPolicyChanged: false,
    httpAttempted: false,
    secretsIncluded: false,
    zoneIdIncluded: false,
    forceApplyIgnored: input.forceApply === true,
    reason: reasonIfHuman,
    note: "Live DNS and access policy are not changed here. Item 221.",
  };
}

function applyDnsRecord(input = {}) {
  return refuse(input, "HUMAN_DNS_CHANGE_REQUIRED");
}

function applyAccessPolicy(input = {}) {
  return refuse(input, "HUMAN_ACCESS_POLICY_REQUIRED");
}

module.exports = { inspect, applyDnsRecord, applyAccessPolicy };
