const TRANSITIONS = Object.freeze({
  "idle>walk": ["idle", "step", "walk"],
  "walk>stand": ["walk", "brake", "stand"],
  "stand>reach": ["stand", "lift-arm", "reach"],
  "reach>grab": ["reach", "close-hand", "grab"],
  "grab>carry": ["grab", "retract", "carry"],
  "carry>walk": ["carry", "step", "walk"],
  "walk>sit": ["walk", "turn", "sit"],
  "sit>work": ["sit", "lean", "work"],
});

function blend(from, to, t) {
  const a = Number(t);
  const k = Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : 0;
  if (typeof from === "number" && typeof to === "number") return from + (to - from) * k;
  if (from && to && typeof from === "object") {
    const out = {};
    for (const key of new Set([...Object.keys(from), ...Object.keys(to)])) {
      out[key] = blend(from[key] ?? 0, to[key] ?? 0, k);
    }
    return out;
  }
  return k < 1 ? from : to;
}

function transition(fromPose, toPose) {
  const key = `${fromPose}>${toPose}`;
  return {
    key,
    stages: TRANSITIONS[key] || [fromPose, toPose],
    hardCut: !TRANSITIONS[key],
  };
}

module.exports = { TRANSITIONS, blend, transition };
