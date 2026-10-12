#!/usr/bin/env node
const { createEngine } = require("./engine");
const { createServer } = require("./http");
const { defaultHome } = require("./paths");

function printHelp() {
  process.stdout.write(`Buzzard Desktop Bridge
Usage:
  node desktop-bridge/src/index.js start
  node desktop-bridge/src/index.js status
  node desktop-bridge/src/index.js recover

Binds to 127.0.0.1 only. File-handoff between ChatGPT and Cursor.
Does not access the ChatGPT app session. Does not auto-run Cursor.
Pusat remains the Buzzard orchestrator.
`);
}

async function main(argv) {
  const command = argv[2] || "start";
  if (command === "help" || command === "--help") {
    printHelp();
    return;
  }
  const engine = createEngine({ home: process.env.BUZZARD_BRIDGE_HOME || defaultHome() });
  engine.recover();
  if (command === "status") {
    process.stdout.write(`${JSON.stringify(engine.snapshot(), null, 2)}\n`);
    return;
  }
  if (command === "recover") {
    process.stdout.write(`${JSON.stringify(engine.recover(), null, 2)}\n`);
    return;
  }
  if (command !== "start") {
    printHelp();
    process.exitCode = 1;
    return;
  }
  const { server, token, host } = createServer(engine, { host: "127.0.0.1", token: process.env.BUZZARD_BRIDGE_TOKEN });
  const port = Number(process.env.BUZZARD_BRIDGE_PORT || 47821);
  await new Promise((resolve) => server.listen(port, host, resolve));
  const url = `http://${host}:${port}/?token=${token}`;
  process.stdout.write(`Buzzard Desktop Bridge listening on ${host}:${port}\n`);
  process.stdout.write(`Open: ${url}\n`);
  process.stdout.write("Direct ChatGPT-session integration: NOT_AVAILABLE. Mode: FILE_HANDOFF.\n");
  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (require.main === module) {
  main(process.argv).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}

module.exports = { main };
