/** Admin JSON-session + optional JWT admin fallback (legacy adapters). */
const legacyAuth = require("../../../lib/auth");

module.exports = {
  realm: "admin",
  extractToken: legacyAuth.extractToken,
  getSession: legacyAuth.getSession,
  logout: legacyAuth.logout,
  authenticate(req) {
    const token = legacyAuth.extractToken(req);
    const session = legacyAuth.getSession(token);
    if (session) {
      return {
        realm: "admin",
        userId: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
        token,
        session,
      };
    }
    if (token) {
      try {
        const { verifyToken } = require("../../../lib/dbAuth");
        const user = verifyToken(token);
        if (user.role === "admin" || user.role === "administrator") {
          return {
            realm: "admin",
            userId: user.sub,
            email: user.email,
            name: user.name || user.email,
            role: user.role === "admin" ? "administrator" : user.role,
            token,
            session: user,
          };
        }
      } catch {
        /* fall through */
      }
    }
    return null;
  },
};
