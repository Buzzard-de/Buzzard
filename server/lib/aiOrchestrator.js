/**
 * Task execution stays behind the human gate.
 * These entry points do not open the commerce database and do not
 * resume payment, purchase, refund, shipment, or provider work.
 */

function blocked(taskId) {
  return {
    ok: false,
    resumed: false,
    executed: false,
    purchased: false,
    moneyMoved: false,
    refunded: false,
    shipmentCreated: false,
    orderChanged: false,
    salesOpen: false,
    egressAllowed: false,
    productionReady: false,
    code: "HUMAN_GATE_REQUIRED",
    taskId: taskId || null,
  };
}

function processTask(taskId) {
  return Promise.resolve(blocked(taskId));
}

function enqueueTaskProcessing(taskId) {
  return blocked(taskId);
}

function resumeAfterApproval(taskId) {
  return blocked(taskId);
}

function selectEmployeeForTask() {
  return null;
}

module.exports = {
  processTask,
  enqueueTaskProcessing,
  resumeAfterApproval,
  selectEmployeeForTask,
};
