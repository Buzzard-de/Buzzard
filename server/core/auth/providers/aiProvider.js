/** AI employee context — never inherits admin permissions. */
const { aiCanExecute } = require("../../../lib/rbac");
const controlCenter = require("../../../lib/controlCenter");

module.exports = {
  realm: "ai",
  authenticate(req) {
    const employeeId = req.headers["x-buzzard-ai-employee-id"];
    if (!employeeId) return null;
    const employee = controlCenter.getAiEmployee(String(employeeId));
    if (!employee || employee.status !== "ACTIVE") return null;
    return {
      realm: "ai",
      userId: employee.id,
      email: null,
      name: employee.name,
      role: "ai_agent",
      permissions: employee.permissions || [],
      employee,
    };
  },
  canExecute(identity, permission) {
    if (!identity || identity.realm !== "ai") return false;
    return aiCanExecute(identity.permissions, permission);
  },
};
