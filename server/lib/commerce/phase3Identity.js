const crypto = require("crypto");

function phase3Identity(orderId) {
  const id = String(orderId || "").trim();
  if (!id) return { ok: false, code: "ORDER_ID_REQUIRED", phase: 3, live: false, payable: false, qr: null };
  const identity = crypto.createHash("sha256").update(`buzzard-phase3:${id}`).digest("hex").slice(0, 24);
  return { ok: true, phase: 3, orderId: id, identity, live: false, payable: false, qr: null };
}

module.exports = { phase3Identity };
