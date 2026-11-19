/**
 * Signing key for customer and service JWTs (dbAuth, identitySecurity).
 *
 * There is no built-in fallback secret: a constant in the source would let
 * anyone sign an administrator token. Without JWT_SECRET (or AUTH_SECRET) the
 * key is random per process, so tokens stop working at the next restart, and
 * production refuses to start (see environmentValidation.js).
 */
const crypto = require("crypto");

const configured = String(process.env.JWT_SECRET || process.env.AUTH_SECRET || "");
const secret = configured || crypto.randomBytes(48).toString("hex");

module.exports = { secret, isConfigured: Boolean(configured) };
