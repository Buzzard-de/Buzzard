/** SQLite JWT auth (databasePlugin / identity). */
const dbAuth = require("../../../lib/dbAuth");

module.exports = {
  realm: "service",
  extractToken: dbAuth.extractToken,
  authenticate(req) {
    const token = dbAuth.extractToken(req);
    if (!token) return null;
    try {
      const user = dbAuth.verifyToken(token);
      return {
        realm: "service",
        userId: user.sub,
        email: user.email,
        name: user.name || user.email,
        role: user.role || "user",
        token,
        session: user,
      };
    } catch {
      return null;
    }
  },
};
