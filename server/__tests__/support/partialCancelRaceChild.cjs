const dbPath = process.argv[2];
const orderId = Number(process.argv[3]);
const itemId = Number(process.argv[4]);
process.env.BUZZARD_DB_PATH = dbPath;
process.env.BUZZARD_SALES_ENABLED = "0";
process.env.BUZZARD_DATA_DIR = process.argv[5];

const orderManagement = require("../../lib/orderManagement");
const result = orderManagement.cancelOrderLines(orderId, {
  actorId: "race@example.invalid",
  actorType: "HUMAN",
  lines: [{ itemId, quantity: 2 }],
});
process.stdout.write(JSON.stringify({ ok: result.ok === true, code: result.code, realMoneyMovement: result.realMoneyMovement === true }));
