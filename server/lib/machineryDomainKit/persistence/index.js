/**
 * P0-ISO / P1-STORE — specialist engine persistence.
 *
 * BUZZARD_MACHINERY_PERSIST:
 *   unset — getEngine() persists (except Vitest / BUZZARD_TEST_MODE / NODE_ENV=test)
 *   "1"   — persist on
 *   "0"   — persist off
 * create*Engine() remains in-memory unless { persist: true }.
 * Isolated tests must pass dbPath or db; never the production file.
 */

const schema = require("./schema");
const sanitize = require("./sanitize");
const repository = require("./repository");
const bind = require("./bind");

module.exports = {
  ...schema,
  ...sanitize,
  ...repository,
  ...bind,
};
