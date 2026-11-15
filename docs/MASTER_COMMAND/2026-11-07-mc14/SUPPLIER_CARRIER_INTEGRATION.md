# Supplier / carrier integration

Roles remain split: SUPPLIER supplies goods; CARRIER transports. Many-to-many edges supported; **edges in inventory: 0** (no invented supplier–carrier links).

Order simulation (`orderLogisticsSim.js`) records a logistics **plan** only: `boundToRealOrders=false`, `stockPurchased=false`, `cannotStartShipment=true`.

Dropshipping: Buzzard does not purchase stock. AI will not pre-buy inventory.
