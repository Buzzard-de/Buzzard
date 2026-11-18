// Preload for test runs: records every attempt to open a connection or resolve a name that is not loopback.
const fs = require("fs");
const net = require("net");
const dns = require("dns");
const out = process.env.NETSPY_FILE;
const local = (host) => !host || host === "localhost" || host === "::1" || host === "::" || host === "0.0.0.0" || /^127\./.test(host) || /^::ffff:127\./.test(host);
function note(kind, host, port) {
  if (!out || local(String(host || ""))) return;
  const at = (new Error().stack || "").split("\n").slice(3).find((l) => !/node:|netspy/.test(l)) || "";
  try { fs.appendFileSync(out, `${kind} ${host}${port ? ":" + port : ""} pid=${process.pid} ${at.trim()}\n`); } catch {}
}
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const o = typeof args[0] === "object" && args[0] !== null ? (Array.isArray(args[0]) ? args[0][0] : args[0]) : { port: args[0], host: args[1] };
  if (o && !o.path) note("connect", typeof o.host === "string" ? o.host : "", o.port);
  return connect.apply(this, args);
};
for (const name of ["lookup", "resolve", "resolve4", "resolve6"]) {
  const original = dns[name];
  dns[name] = function (host, ...rest) { note(`dns.${name}`, host); return original.call(this, host, ...rest); };
  const p = dns.promises[name];
  dns.promises[name] = function (host, ...rest) { note(`dns.promises.${name}`, host); return p.call(this, host, ...rest); };
}
