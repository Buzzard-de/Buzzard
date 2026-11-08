const { createEngine, notImplemented } = require("../engineContract");

const AVATAR = "/council/sinan-bey.png";
const POSES = Object.freeze(["idle", "listening", "thinking", "speaking"]);

function createDigitalBodyEngine() {
  let pose = "idle";
  return createEngine({
    id: "digital_body",
    capabilities: ["pose", "avatar_lock"],
    executeImpl(input) {
      const op = input.op || "state";
      if (op === "state") return { op, pose, avatar: AVATAR, animation: false, lipSync: false };
      if (op === "set_pose") {
        if (!POSES.includes(input.pose)) return { ok: false, code: "UNKNOWN_POSE" };
        pose = input.pose;
        return { op, pose, avatar: AVATAR, animation: false };
      }
      if (op === "lip_sync" || op === "animate") return { ...notImplemented(op), avatar: AVATAR };
      return notImplemented(op);
    },
  });
}

module.exports = { createDigitalBodyEngine, AVATAR, POSES };
