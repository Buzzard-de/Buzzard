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

  placeOrder() {
    return { ok: false, code: "LIVE_ORDER_FORBIDDEN", sandbox: true, live: false, orderCreated: false };
  }
}

module.exports = { InterCarsAdapter };
