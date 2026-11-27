/**
 * Inter Cars sandbox. No credentials and no live order.
 */
class InterCarsAdapter {
  constructor() {
    this.id = "inter_cars";
    this.sandbox = true;
    this.live = false;
  }

  fetchCatalog() {
    return { ok: true, sandbox: true, live: false, records: [], orderCreated: false };
  }

  placeOrder(input = {}) {
    const gate = require("../software/control").enforce({
      engine: "supplier",
      method: "placeOrder",
      actorId: input.actorId,
      mode: "write",
    });
    if (!gate.ok) return { ...gate, sandbox: true, live: false, orderCreated: false };
    return { ok: false, code: "LIVE_ORDER_FORBIDDEN", sandbox: true, live: false, orderCreated: false };
  }
}

module.exports = { InterCarsAdapter };
