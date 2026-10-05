const { cooldownAllows, hashSeed, pick } = require("./variation");
const last = new Map();

const IDLE_POOL = [
  { action: "look_at", targetId: "pen", weight: 1 },
  { action: "look_at", targetId: "notebook", weight: 1 },
  { action: "look_at", targetId: "display_primary", weight: 2 },
  { action: "gesture", name: "nod", weight: 1 },
  { action: "wait", ms: 400, weight: 2 },
];

function nextIdle({ sessionId, state, speaking, listening } = {}) {
  if (speaking) return null;
  const key = sessionId || "default";
  if (!cooldownAllows(key, last, 8000)) return null;
  if (listening) {
    last.set(key, Date.now());
    return { action: "nod", visual: true, micro: true, intensity: "subtle" };
  }
  const seed = hashSeed({ key, state, t: Math.floor(Date.now() / 15000) });
  const chosen = pick(IDLE_POOL, seed);
  last.set(key, Date.now());
  return { ...chosen, visual: true, micro: true, intensity: "subtle" };
}

module.exports = { nextIdle };
