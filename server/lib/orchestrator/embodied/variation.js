function hashSeed(parts) {
  const raw = JSON.stringify(parts);
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick(items, seed) {
  if (!items.length) return null;
  return items[seed % items.length];
}

function varyPlan(candidates, context = {}) {
  const recent = context.recentSequences || [];
  const filtered = candidates.filter((plan) => {
    const sig = plan.map((step) => step.action).join(">");
    return !recent.slice(-5).includes(sig);
  });
  const pool = filtered.length ? filtered : candidates;
  const seed = hashSeed({
    goal: context.goal,
    intent: context.intent,
    lastLocation: context.lastLocation,
    hour: context.hour,
    urgency: context.urgency,
    previous: recent[recent.length - 1],
  });
  const chosen = pick(pool, seed);
  return {
    plan: chosen,
    signature: chosen.map((step) => step.action).join(">"),
    variation: true,
    random: false,
    reason: "context-aware",
  };
}

function cooldownAllows(key, map, ms) {
  const last = map.get(key) || 0;
  return Date.now() - last >= ms;
}

module.exports = { hashSeed, pick, varyPlan, cooldownAllows };
