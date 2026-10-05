const { PRIORITY, EMBODIED_STATE } = require("./constants");

function rank(kind) {
  const map = {
    SAFETY: PRIORITY.SAFETY,
    SECURITY: PRIORITY.SECURITY,
    HUMAN_HANDOFF: PRIORITY.HUMAN_HANDOFF,
    USER_CURRENT_REQUEST: PRIORITY.USER_CURRENT_REQUEST,
    ACTIVE_TASK: PRIORITY.ACTIVE_TASK,
    BACKGROUND_ACTION: PRIORITY.BACKGROUND_ACTION,
  };
  return map[kind] ?? PRIORITY.BACKGROUND_ACTION;
}

function shouldPreempt(currentKind, incomingKind) {
  return rank(incomingKind) <= rank(currentKind);
}

function applyInterrupt(runtimeState, incoming) {
  if (incoming.kind === "SAFETY" || incoming.kind === "SECURITY" || incoming.kind === "HUMAN_HANDOFF") {
    return {
      ...runtimeState,
      pausedTask: runtimeState.currentTask,
      currentTask: incoming.task || null,
      state: incoming.kind === "HUMAN_HANDOFF" ? EMBODIED_STATE.HANDOFF : EMBODIED_STATE.WAITING,
      speaking: false,
      listening: true,
      interrupted: true,
      interruptKind: incoming.kind,
    };
  }
  if (!shouldPreempt(runtimeState.priorityKind || "ACTIVE_TASK", incoming.kind)) {
    return { ...runtimeState, queued: [...(runtimeState.queued || []), incoming] };
  }
  return {
    ...runtimeState,
    pausedTask: runtimeState.currentTask,
    currentTask: incoming.task || runtimeState.currentTask,
    state: EMBODIED_STATE.LISTENING,
    speaking: false,
    listening: true,
    interrupted: true,
    interruptKind: incoming.kind,
    priorityKind: incoming.kind,
  };
}

function resumePaused(runtimeState) {
  if (!runtimeState.pausedTask) return runtimeState;
  return {
    ...runtimeState,
    currentTask: runtimeState.pausedTask,
    pausedTask: null,
    interrupted: false,
    state: EMBODIED_STATE.WORKING,
    priorityKind: "ACTIVE_TASK",
  };
}

module.exports = { rank, shouldPreempt, applyInterrupt, resumePaused, PRIORITY };
