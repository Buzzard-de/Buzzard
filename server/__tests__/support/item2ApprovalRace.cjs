const { createDurableTaskQueue } = require("../../lib/pusat/durableTaskQueue");

const queue = createDurableTaskQueue({ dbPath: process.argv[2] });
const result = queue.decideApproval({
  id: process.argv[3],
  approved: true,
  actorId: process.argv[4] || "human",
});
queue.close();
process.stdout.write(`${JSON.stringify({ ok: Boolean(result.ok), code: result.code || null })}\n`);
