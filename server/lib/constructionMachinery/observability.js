function createObservability() {
  const counters = new Map();
  const events = [];

  function record(name, payload = {}) {
    counters.set(name, (counters.get(name) || 0) + 1);
    events.push({ name, at: new Date().toISOString(), ...payload });
    if (events.length > 500) events.splice(0, events.length - 500);
  }

  function snapshot() {
    return {
      counters: Object.fromEntries(counters),
      recent: events.slice(-20),
    };
  }

  return { record, snapshot };
}

module.exports = { createObservability };
