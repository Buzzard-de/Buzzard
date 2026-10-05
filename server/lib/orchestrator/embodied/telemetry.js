const sessions = new Map();

function start(sessionId) {
  const row = {
    sessionId,
    startedAt: Date.now(),
    sttMs: null,
    orchestratorMs: null,
    ttsMs: null,
    avatarMs: null,
    webrtcMs: null,
    totalMs: null,
    errors: [],
    reconnects: 0,
    provider: null,
  };
  sessions.set(sessionId, row);
  return row;
}

function mark(sessionId, field, ms) {
  const row = sessions.get(sessionId) || start(sessionId);
  row[field] = ms;
  return row;
}

function finish(sessionId, extra = {}) {
  const row = sessions.get(sessionId) || start(sessionId);
  row.totalMs = Date.now() - row.startedAt;
  Object.assign(row, extra);
  return { ...row };
}

module.exports = { start, mark, finish };
