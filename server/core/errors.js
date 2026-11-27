const crypto = require("crypto");

function newErrorId() {
  return `err_${crypto.randomBytes(6).toString("hex")}`;
}

function publicError(_message, errorKey = "core.error") {
  return {
    success: false,
    errorKey,
  };
}

module.exports = { newErrorId, publicError };
