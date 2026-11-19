/**
 * The request a piece of code is running for, without passing `req` through
 * every call. Log writers use it to stamp entries with the request and
 * correlation ids.
 */
const { AsyncLocalStorage } = require("async_hooks");

const storage = new AsyncLocalStorage();

function run(scope, fn) {
  return storage.run(scope, fn);
}

function current() {
  return storage.getStore() || null;
}

/** `{ requestId, correlationId }` of the running request, or an empty object. */
function ids() {
  const scope = current();
  if (!scope) return {};
  const out = {};
  if (scope.requestId) out.requestId = scope.requestId;
  if (scope.correlationId) out.correlationId = scope.correlationId;
  return out;
}

module.exports = { run, current, ids };
