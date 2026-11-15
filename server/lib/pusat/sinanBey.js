/**
 * Sinan Bey — Kurmay Heyeti software architect. Does not chair, pay, or ship live.
 */
const { getMember, canShare, createTask, CLASSIFICATION } = require("./council");

const IDENTITY = Object.freeze({
  id: "sinan_bey",
  name: "Sinan Bey",
  gender: "male",
  avatar: "/council/sinan-bey.png",
  namedAfter: "Mimar Sinan",
  alwaysOnProcess: false,
});

function identity() {
  const member = getMember(IDENTITY.id);
  return {
    ...IDENTITY,
    present: Boolean(member),
    role: member?.role || null,
    canCommit: false,
    cannotEnableSales: true,
    cannotExecutePayments: true,
    liveShipment: false,
    replacesEsat: false,
    replacesDogu: false,
  };
}

function coordinate({ toId, title, classification = CLASSIFICATION.PUBLIC } = {}) {
  const allowed = canShare({ fromId: IDENTITY.id, toId, classification });
  if (!allowed) {
    return { ok: false, code: "SHARE_DENIED", via: "pusat" };
  }
  const task = createTask({
    fromId: IDENTITY.id,
    title: title || `coordinate-with-${toId}`,
    assigneeId: toId,
    classification,
  });
  return {
    ...task,
    via: "pusat",
    commercialCommit: false,
    liveShipment: false,
  };
}

module.exports = { IDENTITY, identity, coordinate };
