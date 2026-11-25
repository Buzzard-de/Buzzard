function inventory() {
  return {
    live: false,
    salesEnabled: false,
    network: false,
    integrations: [
      { id: "inter_cars", mode: "sandbox", live: false, orders: false },
      { id: "tecdoc", mode: "sandbox", live: false, catalog: false },
      { id: "stripe", mode: "locked", live: false },
      { id: "paypal", mode: "locked", live: false },
      { id: "carriers", mode: "stub", live: false },
      { id: "marketplaces", mode: "blocked", live: false },
      { id: "trendyol", mode: "international-sandbox", live: false, orders: false, network: false, storeFrontCode: "DE" },
    ],
  };
}

module.exports = { inventory };
