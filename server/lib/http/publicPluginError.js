const { toPublicError, sanitizeErrorKey, publicErrorBody } = require("../security");

function sendPublicError(res, status, fallbackKey, err) {
  res.status(status).json(toPublicError(err || {}, fallbackKey));
  return res;
}

function sendAdminGateError(res, err) {
  const fallback = sanitizeErrorKey(err?.code, "admin_action_blocked");
  return sendPublicError(res, 403, fallback, err);
}

function sendAuthRequired(res) {
  res.status(401).json(publicErrorBody("security.authRequired"));
  return res;
}

function sendAdminRequired(res) {
  res.status(403).json(publicErrorBody("security.adminRequired"));
  return res;
}

function sendInvalidToken(res) {
  res.status(401).json(publicErrorBody("security.invalidToken"));
  return res;
}

function sendKeyedResult(res, result, fallbackKey = "security.request.invalid") {
  const status = Number(result?.status) || 400;
  const body = toPublicError(result || {}, fallbackKey);
  if (result && typeof result === "object") {
    for (const key of ["live", "queued", "published", "catalogMode", "ok", "reason"]) {
      if (Object.prototype.hasOwnProperty.call(result, key)) body[key] = result[key];
    }
  }
  res.status(status).json(body);
  return res;
}

module.exports = {
  sendPublicError,
  sendAdminGateError,
  sendAuthRequired,
  sendAdminRequired,
  sendInvalidToken,
  sendKeyedResult,
};
