const { varyPlan } = require("./variation");
const { walkTo, retrieveDocument, startCall, writeNote, computerAction } = require("./actions");
const { getObject } = require("./worldGraph");

function step(action, extra = {}) {
  return { action, visual: true, ...extra };
}

function candidatePlans(goal, truth) {
  const g = String(goal || "").toLowerCase();
  if (/supplier|tedarik|liefer/i.test(g) || /report|rapor|bericht/i.test(g)) {
    const computer = [
      step("walk_to", { targetId: "desk_main" }),
      step("sit_down", { targetId: "chair_main" }),
      step("look_at", { targetId: "computer_main" }),
      step("type", { targetId: "computer_main", representationOnly: true }),
      step("speak"),
    ];
    const cabinet = [
      step("stand_up"),
      step("walk_to", { targetId: "cabinet" }),
      step("open_cabinet", { targetId: "cabinet" }),
      step("retrieve_document", { requires: "documentFound" }),
      step("close_cabinet", { targetId: "cabinet" }),
      step("walk_to", { targetId: "desk_main" }),
      step("sit_down", { targetId: "chair_main" }),
      step("speak"),
    ];
    const archive = [
      step("walk_to", { targetId: "archive" }),
      step("inspect", { targetId: "archive" }),
      step("walk_to", { targetId: "desk_main" }),
      step("speak"),
    ];
    const notebook = [
      step("look_at", { targetId: "notebook" }),
      step("write", { kind: "VISUAL_ACTION" }),
      step("look_at", { targetId: "computer_main" }),
      step("speak"),
    ];
    const print = [
      step("walk_to", { targetId: "desk_main" }),
      step("type", { targetId: "computer_main", representationOnly: true }),
      step("walk_to", { targetId: "printer" }),
      step("print", { targetId: "printer", representationOnly: true }),
      step("walk_to", { targetId: "desk_main" }),
      step("speak"),
    ];
    const compare = [
      step("walk_to", { targetId: "screens_ops" }),
      step("walk_to", { targetId: "archive" }),
      step("inspect", { targetId: "archive" }),
      step("look_at", { targetId: "notebook" }),
      step("speak"),
    ];
    return truth?.documentFound
      ? [cabinet, computer, archive, notebook, print, compare]
      : [computer, archive, notebook, print, compare];
  }
  if (/ara|anrufen|call|telefon/i.test(g)) {
    return [[step("walk_to", { targetId: "phone_front" }), step("call", { requires: "callAuthorized" })]];
  }
  if (/yaz|write|notiz|note/i.test(g)) {
    return [[step("look_at", { targetId: "notebook" }), step("write")]];
  }
  return [[step("listen"), step("think"), step("speak")]];
}

function decorate(stepRow) {
  const gaze =
    stepRow.targetId === "cabinet"
      ? "CABINET"
      : stepRow.targetId === "computer_main" || stepRow.targetId === "screens_ops"
        ? "SCREEN"
        : stepRow.action === "speak"
          ? "USER"
          : stepRow.targetId === "phone_front"
            ? "PHONE"
            : "OBJECT";
  const camera =
    stepRow.action === "walk_to"
      ? "FOLLOW"
      : stepRow.targetId === "cabinet"
        ? "CABINET"
        : stepRow.action === "speak"
          ? "MEDIUM"
          : "DESK";
  return {
    ...stepRow,
    gaze,
    camera,
    gesture: stepRow.action === "speak" ? "open-hand" : stepRow.action === "walk_to" ? "none" : "reach",
    timingMs: stepRow.action === "think" ? null : stepRow.action === "walk_to" ? 900 : 350,
    interruptible: stepRow.action !== "retrieve_document",
    speech: stepRow.action === "speak",
  };
}

function planBehavior({ goal, intent, characterState, truth, recentSequences, urgency, hour, risk, availableObjects } = {}) {
  const candidates = candidatePlans(goal || intent, truth).map((plan) => plan.map(decorate));
  const varied = varyPlan(candidates, {
    goal,
    intent,
    lastLocation: characterState?.currentLocation,
    recentSequences,
    urgency,
    hour,
    risk,
    availableObjects,
  });
  return {
    ok: true,
    layer: "HOW",
    plan: varied.plan,
    signature: varied.signature,
    variation: true,
    truth,
  };
}

function materializeStep(world, character, stepRow, truth) {
  if (stepRow.action === "walk_to") return walkTo(world, character, stepRow.targetId);
  if (stepRow.action === "retrieve_document") return retrieveDocument(world, truth);
  if (stepRow.action === "call") return startCall(world, truth);
  if (stepRow.action === "write") return writeNote(stepRow.text, truth);
  if (["type", "click", "scroll", "print"].includes(stepRow.action)) return computerAction(stepRow.action, truth);
  if (stepRow.targetId && !getObject(world, stepRow.targetId) && stepRow.action !== "speak") {
    return { ok: false, code: "OBJECT_NOT_FOUND", visual: false };
  }
  return { ok: true, ...stepRow };
}

module.exports = { planBehavior, materializeStep, candidatePlans };
