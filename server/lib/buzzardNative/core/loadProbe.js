const { ids } = require("./identityRegistry");
const { think } = require("./sharedThinking");
const { probeHardware } = require("../thinking/hardwareProbe");

function rssMb() {
  return process.memoryUsage().rss / (1024 * 1024);
}

function runLoad() {
  const hw = probeHardware();
  const scenarios = [
    { name: "one", n: 1 },
    { name: "two", n: 2 },
    { name: "four", n: 4 },
    { name: "eight", n: 8 },
    { name: "ten", n: 10 },
    { name: "pusat_plus_three", n: 4, pick: ["pusat", "sinan_bey", "esat_bey", "dogu_bey"] },
    { name: "all_registered", n: 10 },
  ];
  const results = [];
  for (const s of scenarios) {
    const agents = (s.pick || ids()).slice(0, s.n);
    const t0 = process.hrtime.bigint();
    const rss0 = rssMb();
    let errors = 0;
    for (const id of agents) {
      const r = think({ agentId: id, facts: { ask_expertise: true } });
      if (!r.ok) errors += 1;
    }
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    results.push({
      name: s.name,
      agents: agents.length,
      ms,
      rssDeltaMb: rssMb() - rss0,
      errors,
      sequential: true,
      parallelOsThreads: false,
    });
  }
  return {
    hardware: hw,
    results,
    eightParallelNativeThreads: false,
    tenParallelNativeThreads: false,
    note: "In-process sequential think calls. Not ten OS processes or ten LLMs. GPU none.",
    sufficientForRuleRuntime: true,
    sufficientForEightLlm: false,
    sufficientForTenLlm: false,
  };
}

module.exports = { runLoad };
