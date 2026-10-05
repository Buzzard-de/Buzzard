const EMBODIED_STATE = Object.freeze({
  IDLE: "IDLE",
  LISTENING: "LISTENING",
  THINKING: "THINKING",
  SPEAKING: "SPEAKING",
  WORKING: "WORKING",
  WALKING: "WALKING",
  SEARCHING: "SEARCHING",
  READING: "READING",
  WRITING: "WRITING",
  USING_COMPUTER: "USING_COMPUTER",
  USING_PHONE: "USING_PHONE",
  GETTING_DOCUMENT: "GETTING_DOCUMENT",
  RETURNING_TO_DESK: "RETURNING_TO_DESK",
  WAITING: "WAITING",
  HANDOFF: "HANDOFF",
  ERROR: "ERROR",
  OFFLINE: "OFFLINE",
});

const CAMERAS = Object.freeze([
  "FRONT",
  "MEDIUM",
  "CLOSE",
  "CLOSEUP",
  "FOLLOW",
  "DESK",
  "CABINET",
  "SCREEN",
  "LEFT",
  "RIGHT",
  "BACK",
  "OVERHEAD",
]);

const ZONES = Object.freeze({
  FRONT: "FRONT",
  BACK: "BACK",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  CENTER: "CENTER",
});

const PRIORITY = Object.freeze({
  SAFETY: 0,
  SECURITY: 1,
  HUMAN_HANDOFF: 2,
  USER_CURRENT_REQUEST: 3,
  ACTIVE_TASK: 4,
  BACKGROUND_ACTION: 5,
});

const EXPRESSIONS = Object.freeze([
  "neutral",
  "friendly",
  "thinking",
  "focused",
  "happy",
  "concerned",
  "surprised",
  "listening",
  "speaking",
]);

module.exports = {
  EMBODIED_STATE,
  CAMERAS,
  ZONES,
  PRIORITY,
  EXPRESSIONS,
};
