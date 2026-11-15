const { createEngine, notImplemented } = require("../engineContract");
const signaling = require("../../voice/signaling");
const { createSessionHub } = require("../realtime/nativeSession");
const { duplexOnce } = require("../realtime/duplex");

function createRealtimeEngine() {
  const hub = createSessionHub();
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
      if (op === "session_open") return { op, ...hub.open(input) };
      if (op === "session_send") return { op, ...hub.send(input) };
      if (op === "session_close") return { op, ...hub.close(input) };
      if (op === "session_disconnect") return { op, ...hub.disconnect(input) };
      if (op === "session_reconnect") return { op, ...hub.reconnect(input) };
      if (op === "duplex") return { op, ...duplexOnce(input) };
      if (op === "live_audio" || op === "live_video") {
        return { ...notImplemented(op), liveMedia: false, liveCommunicationPass: false };
      }
      return notImplemented(op);
    },
  });
}

module.exports = { createRealtimeEngine };
