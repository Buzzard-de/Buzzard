#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { createEngine } = require("./engine");
const { createServer } = require("./http");
const { defaultHome, ensureDir } = require("./paths");
const { listenLoopback } = require("./listen");

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
  const home = engine.home();
  ensureDir(home);
  const logFile = path.join(home, "bridge.log");
  const { server, token, host } = createServer(engine, { host: "127.0.0.1", token: process.env.BUZZARD_BRIDGE_TOKEN });
  const preferred = Number(process.env.BUZZARD_BRIDGE_PORT || 47821);
  let address;
  try {
    address = await listenLoopback(server, { host, port: preferred });
  } catch (error) {
    process.stderr.write(`Port conflict or bind failure: ${error.message}\n`);
    process.stderr.write("Set BUZZARD_BRIDGE_PORT to a free loopback port.\n");
    throw error;
  }
  const url = `http://${host}:${address.port}/?token=${token}`;
  fs.appendFileSync(logFile, `${new Date().toISOString()} listening ${host}:${address.port}\n`);
  process.stdout.write(`Buzzard Desktop Bridge listening on ${host}:${address.port}\n`);
  process.stdout.write(`Open: ${url}\n`);
  process.stdout.write(`Log: ${logFile}\n`);
  process.stdout.write("DIRECT_CHATGPT_SESSION: NOT_AVAILABLE. Mode: FILE_HANDOFF.\n");
  const openBrowser = process.env.BUZZARD_BRIDGE_OPEN_BROWSER !== "0";
  if (openBrowser && process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
  }
  const shutdown = () => {
    fs.appendFileSync(logFile, `${new Date().toISOString()} shutdown\n`);
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
