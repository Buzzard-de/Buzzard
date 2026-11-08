const { createEngine, notImplemented } = require("../engineContract");
const signaling = require("../../voice/signaling");

function createRealtimeEngine() {
  return createEngine({
    id: "realtime",
    capabilities: ["internal_message", "in_process_signaling"],
    executeImpl(input) {
      const op = input.op || "message";
      if (op === "message") {
        return { op, delivered: true, transport: "in_process", encryptedFlag: false, liveMedia: false };
      }
      if (op === "room") {
        const room = signaling.createRoom({ participants: input.participants || ["sinan_bey", "pusat"] });
        return { op, ...room, liveMedia: false };
      }
      if (op === "live_audio" || op === "live_video") return { ...notImplemented(op), liveMedia: false };
      return notImplemented(op);
    },
  });
}

module.exports = { createRealtimeEngine };
