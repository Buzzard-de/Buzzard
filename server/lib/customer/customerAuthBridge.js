/**
 * Part 19 — Unified customer session resolution (account token + optional JWT).
 */
const customerAuth = require("../customerAuth");

function resolveCustomerSession(req) {
  const token = customerAuth.extractToken(req);
  if (!token) return null;

  const fileSession = customerAuth.getSession(token);
  if (fileSession) {
    return {
      customerId: fileSession.customerId,
      email: fileSession.email,
      authSource: "customerAuth",
      token,
    };
  }

  try {
    const { verifyToken } = require("../dbAuth");
    const user = verifyToken(token);
    if (user?.role === "customer" || user?.sub) {
      return {
        customerId: user.sub || user.id,
        email: user.email,
        authSource: "jwt",
        token,
      };
    }
  } catch {
    /* not a JWT customer token */
  }

  return null;
}

function requireCustomerSession(req, res) {
  const session = resolveCustomerSession(req);
  if (!session) {
    res.status(401).json({ success: false, errorKey: "account.auth.required" });
    return null;
  }
  req.customerSession = session;
  return session;
}

module.exports = {
  resolveCustomerSession,
  requireCustomerSession,
};
