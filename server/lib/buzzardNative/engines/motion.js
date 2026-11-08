const { createEngine, notImplemented } = require("../engineContract");

function createMotionEngine() {
  const timeline = [];
  return createEngine({
    id: "motion",
    capabilities: ["timeline_record"],
    executeImpl(input) {
      const op = input.op || "timeline";
      if (op === "timeline") return { op, events: [...timeline], live: false };
      if (op === "cue") {
        timeline.push({ cue: input.cue || "idle", at: Date.now(), rendered: false });
        return { op, recorded: true, rendered: false };
      }
      if (op === "render" || op === "audio_to_face") return notImplemented(op);
      return notImplemented(op);
    },
  });
}

module.exports = { createMotionEngine };
