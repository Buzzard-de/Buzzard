/** Customer file-session auth (legacy). */
const customerAuth = require("../../../lib/customerAuth");

module.exports = {
  realm: "customer",
  extractToken: customerAuth.extractToken,
  getSession: customerAuth.getSession,
  logout: customerAuth.logout,
  authenticate(req) {
    const token = customerAuth.extractToken(req);
    const session = customerAuth.getSession(token);
    if (!session) return null;
    return {
      realm: "customer",
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: "customer",
      token,
      session,
    };
  },
};
