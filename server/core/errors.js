const crypto = require("crypto");

function newErrorId() {
  return `err_${crypto.randomBytes(6).toString("hex")}`;
}

function publicError(message, errorKey = "core.error", statusCode = 500, meta = {}) {
  const errorId = newErrorId();
  return {
    success: false,
    errorKey,
    message,
    errorId,
    ...meta,
  };
}

module.exports = { newErrorId, publicError };
