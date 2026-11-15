/**
 * Eight-engine flow. Failures propagate; never marked success.
 */
function runCouncilTurn(runtime, { actorId = "sinan_bey", pcm, text, facts = {} } = {}) {
  const steps = [];
  function step(engineId, payload) {
    const q = runtime.enqueue({ engineId, actorId, payload });
    if (!q.ok) {
      steps.push({ engineId, ok: false, reason: q.code, result: q });
      return q;
    }
    const run = runtime.runNext();
    steps.push({ engineId, ok: run.ok, result: run.result });
    return run;
  }

  step("hearing", { op: "vad", pcm });
  const think = step("thinking", { op: "plan", goal: text || "report.status then wait" });
  step("memory", { op: "get", ownerId: actorId, actorId, section: "C", key: "last_plan" });
  if (think.ok) {
    step("thinking", { op: "evaluate", condition: { ready: true }, facts: { ready: true, ...facts } });
  }
  const speech = step("speech", { op: "identity", memberId: actorId });
  step("digital_body", { op: "set_pose", pose: speech.ok ? "speaking" : "idle" });
  step("motion", { op: "cue", cue: "speak_intent" });
  const rt = step("realtime", { op: "message", text: "status" });

  const failed = steps.filter((s) => !s.ok);
  return {
    ok: failed.length === 0,
    failed: failed.map((s) => s.engineId),
    steps,
    liveAudio: false,
    liveTts: false,
    learnedModel: false,
  };
}

module.exports = { runCouncilTurn };
