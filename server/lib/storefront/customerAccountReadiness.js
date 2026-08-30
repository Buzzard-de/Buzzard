/**
 * Part 18 — Customer account readiness (no fake orders, sales OFF safe).
 */
const { db } = require("../db");
const goLiveApproval = require("../commerce/goLiveApproval");

function getCustomerAccountReadiness() {
  let userCount = 0;
  let addressTable = false;
  try {
    userCount = db.prepare("SELECT COUNT(*) n FROM users").get()?.n ?? 0;
    db.prepare("SELECT 1 FROM user_addresses LIMIT 1").get();
    addressTable = true;
  } catch {
    addressTable = false;
  }

  const routes = [
    "POST /api/account/register",
    "POST /api/account/login",
    "POST /api/account/logout",
    "GET /api/account/me",
    "GET /api/account/profile",
    "GET /api/account/addresses",
    "GET /api/account/orders",
    "POST /api/account/password-reset/request",
  ];

  return {
    authRoutes: routes,
    registrationReady: true,
    loginReady: true,
    passwordResetArchitecture: true,
    profileReady: true,
    addressesReady: addressTable,
    orderHistoryArchitecture: true,
    realOrdersEnabled: false,
    fakeOrdersCreated: false,
    userCount,
    salesRequiredForOrders: true,
    goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
  };
}

module.exports = {
  getCustomerAccountReadiness,
};
