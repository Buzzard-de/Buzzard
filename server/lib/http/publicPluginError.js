const { toPublicError, sanitizeErrorKey } = require("../security");

function sendPublicError(res, status, fallbackKey, err) {
  res.status(status).json(toPublicError(err || {}, fallbackKey));
  return res;
}

function sendAdminGateError(res, err) {
  const fallback = sanitizeErrorKey(err?.code, "admin_action_blocked");
  return sendPublicError(res, 403, fallback, err);
}

module.exports = { sendPublicError, sendAdminGateError };
