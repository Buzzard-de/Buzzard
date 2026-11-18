// Stress for the store lock: many processes appending to one record list while the CPU is busy.
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const lib = path.join(process.cwd(), "server/lib/");
const WRITERS = Number(process.env.WRITERS || 16);
const PER = Number(process.env.PER || 100);
const ROUNDS = Number(process.env.ROUNDS || 3);
function run(script, env) {
  return new Promise((resolve, reject) => {
    const c = spawn(process.execPath, ["-e", script], { env: { ...process.env, ...env }, stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    c.stderr.on("data", (d) => (err += d));
    c.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-300)))));
  });
}
(async () => {
  for (let round = 1; round <= ROUNDS; round += 1) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-lock-stress-"));
    const env = { BUZZARD_DATA_DIR: dir, NODE_ENV: "test", BUZZARD_TEST_MODE: "1" };
    const hogs = Array.from({ length: 4 }, () => run("const e=Date.now()+6000;while(Date.now()<e){}", {}));
    const writers = Array.from({ length: WRITERS }, (_, w) =>
      run(`const a=require(${JSON.stringify(lib)}+"coreAudit.js");for(let i=0;i<${PER};i++)a.logAudit({userId:"u",action:"w${w}-"+i});`, env)
    );
    await Promise.all([...writers, ...hogs]);
    process.env.BUZZARD_DATA_DIR = dir;
    const { verifyChain } = require(lib + "recordStore.js");
    const entries = JSON.parse(fs.readFileSync(path.join(dir, "audit-log.json"), "utf8"));
    const unique = new Set(entries.map((e) => e.action)).size;
    const chain = verifyChain(entries);
    const leftovers = fs.readdirSync(dir).filter((n) => n.includes(".lock") || n.endsWith(".tmp"));
    console.log(`round ${round}: entries=${entries.length}/${WRITERS * PER} unique=${unique} chain=${chain.ok} leftovers=${leftovers.length}`);
    if (entries.length !== WRITERS * PER || unique !== WRITERS * PER || !chain.ok || leftovers.length) process.exit(1);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
