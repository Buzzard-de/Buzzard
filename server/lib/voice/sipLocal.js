/**
 * Local SIP and RTP loopback. This does not place a carrier call.
 */
const dgram = require("dgram");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function commandExists(name) {
  const ran = spawnSync("which", [name], { encoding: "utf8" });
  return ran.status === 0 && Boolean(String(ran.stdout || "").trim());
}

function isRtp(msg) {
  return Buffer.isBuffer(msg) && msg.length >= 12 && msg[0] === 0x80 && (msg[1] & 0x7f) === 0;
}

function rtpPacket(payload) {
  const header = Buffer.alloc(12);
  header[0] = 0x80;
  header[1] = 0;
  header.writeUInt16BE(1, 2);
  header.writeUInt32BE(160, 4);
  header.writeUInt32BE(1000, 8);
  return Buffer.concat([header, payload]);
}

function localSipCall({ payload = Buffer.from([0x10, 0x20, 0x30, 0x40]) } = {}) {
  return new Promise((resolve) => {
    const caller = dgram.createSocket("udp4");
    const callee = dgram.createSocket("udp4");
    const media = dgram.createSocket("udp4");
    let settled = false;
    let rtp = 0;
    let ack = false;
    const finish = (row) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const socket of [caller, callee, media]) {
        try { socket.close(); } catch { /* already closed */ }
      }
      resolve(row);
    };
    const timer = setTimeout(() => finish({
      ok: false,
      code: "SIP_TIMEOUT",
      carrier: false,
      placedOnCarrier: false,
      network: "LOOPBACK",
    }), 3000);
    media.on("message", (msg) => {
      if (isRtp(msg)) rtp += 1;
    });
    callee.on("message", (msg, rinfo) => {
      const text = msg.toString("utf8");
      if (text.startsWith("INVITE") && text.includes("Call-ID:") && text.includes("CSeq: 1 INVITE")) {
        const port = media.address().port;
        const ok = "SIP/2.0 200 OK\r\nCall-ID: lab\r\nCSeq: 1 INVITE\r\nContent-Type: application/sdp\r\n\r\nv=0\r\nm=audio " + port + " RTP/AVP 0\r\n";
        callee.send(ok, rinfo.port, rinfo.address);
      } else if (text.startsWith("ACK")) {
        ack = true;
      } else if (text.startsWith("BYE")) {
        callee.send("SIP/2.0 200 OK\r\nCall-ID: lab\r\nCSeq: 2 BYE\r\n\r\n", rinfo.port, rinfo.address);
      }
    });
    caller.on("message", (msg, rinfo) => {
      const text = msg.toString("utf8");
      if (text.includes("m=audio")) {
        const port = Number(text.match(/m=audio (\d+)/)[1]);
        caller.send(rtpPacket(payload), port, "127.0.0.1");
        caller.send("ACK sip:lab SIP/2.0\r\nCall-ID: lab\r\nCSeq: 1 ACK\r\n\r\n", rinfo.port, rinfo.address);
        caller.send("BYE sip:lab SIP/2.0\r\nCall-ID: lab\r\nCSeq: 2 BYE\r\n\r\n", rinfo.port, rinfo.address);
      } else if (text.includes("CSeq: 2 BYE")) {
        finish({
          ok: rtp === 1 && ack,
          rtpPackets: rtp,
          ack,
          sip: true,
          protocol: "SIP/2.0",
          media: "RTP",
          srtp: false,
          rtp: true,
          tls: false,
          mediaSecurity: "NONE",
          secure: false,
          turnCandidate: "coturn",
          turnInstalled: commandExists("turnserver"),
          turnUsed: false,
          carrier: false,
          placedOnCarrier: false,
          localLab: true,
          carrierInbound: false,
          carrierOutbound: false,
          operatorCall: false,
          opensipsInstalled: false,
          asteriskInstalled: false,
          freeswitchInstalled: commandExists("freeswitch"),
          phoneLine: "BLOCKED_EXTERNAL",
          operatorAccount: false,
          selfHostedCandidate: "freeswitch",
          network: "LOOPBACK",
          internet: false,
          paid: false,
        });
      }
    });
    media.bind(0, "127.0.0.1", () => {
      callee.bind(0, "127.0.0.1", () => {
        caller.bind(0, "127.0.0.1", () => {
          const invite = "INVITE sip:lab@127.0.0.1 SIP/2.0\r\nCall-ID: lab\r\nCSeq: 1 INVITE\r\nContent-Type: application/sdp\r\n\r\nv=0\r\n";
          caller.send(invite, callee.address().port, "127.0.0.1");
        });
      });
    });
  });
}

function labResult(extra) {
  return {
    carrier: false,
    placedOnCarrier: false,
    localLab: true,
    operatorAccount: false,
    operatorCall: false,
    phoneLine: "BLOCKED_EXTERNAL",
    srtp: false,
    secure: false,
    internet: false,
    network: "LOOPBACK",
    paid: false,
    freeswitchInstalled: commandExists("freeswitch"),
    ...extra,
  };
}

function localSipBusy() {
  return new Promise((resolve) => {
    const caller = dgram.createSocket("udp4");
    const callee = dgram.createSocket("udp4");
    let settled = false;
    const finish = (row) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const socket of [caller, callee]) {
        try { socket.close(); } catch { /* already closed */ }
      }
      resolve(row);
    };
    const timer = setTimeout(() => finish(labResult({ ok: false, code: "SIP_TIMEOUT", handled: false, connected: false })), 3000);
    callee.on("message", (msg, rinfo) => {
      if (msg.toString("utf8").startsWith("INVITE")) {
        callee.send("SIP/2.0 486 Busy Here\r\nCall-ID: lab\r\nCSeq: 1 INVITE\r\n\r\n", rinfo.port, rinfo.address);
      }
    });
    caller.on("message", (msg) => {
      if (msg.toString("utf8").includes("486")) {
        finish(labResult({
          ok: false,
          code: "SIP_BUSY",
          handled: true,
          connected: false,
          rtpPackets: 0,
          rtp: false,
          direction: "outbound",
          record: { direction: "outbound", result: "SIP_BUSY", media: "NONE", srtp: false },
        }));
      }
    });
    callee.bind(0, "127.0.0.1", () => {
      caller.bind(0, "127.0.0.1", () => {
        caller.send("INVITE sip:lab@127.0.0.1 SIP/2.0\r\nCall-ID: lab\r\nCSeq: 1 INVITE\r\n\r\n", callee.address().port, "127.0.0.1");
      });
    });
  });
}

function localSipInbound({ payload = Buffer.from([0x10, 0x20]) } = {}) {
  const { canUse } = require("../buzzardNative/core/capabilityRegistry");
  const allowed = canUse("zeynep_hanim", "speech") && canUse("zeynep_hanim", "phone_assistant");
  return new Promise((resolve) => {
    const caller = dgram.createSocket("udp4");
    const callee = dgram.createSocket("udp4");
    const media = dgram.createSocket("udp4");
    let settled = false;
    let rtp = 0;
    const finish = (row) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const socket of [caller, callee, media]) {
        try { socket.close(); } catch { /* already closed */ }
      }
      resolve(row);
    };
    const timer = setTimeout(() => finish(labResult({ ok: false, code: "SIP_TIMEOUT", direction: "inbound", connected: false })), 3000);
    media.on("message", (msg) => {
      if (!isRtp(msg)) return;
      rtp += 1;
      finish(labResult({
        ok: true,
        code: "SIP_INBOUND",
        direction: "inbound",
        routedTo: "zeynep_hanim",
        connected: true,
        rtpPackets: rtp,
        rtp: true,
        media: "RTP",
        record: { agentId: "zeynep_hanim", direction: "inbound", media: "RTP", srtp: false },
      }));
    });
    callee.on("message", (msg, rinfo) => {
      const text = msg.toString("utf8");
      if (!text.startsWith("INVITE")) return;
      if (!allowed) {
        callee.send("SIP/2.0 403 Forbidden\r\nCall-ID: lab\r\nCSeq: 1 INVITE\r\n\r\n", rinfo.port, rinfo.address);
        return;
      }
      const port = media.address().port;
      callee.send(`SIP/2.0 200 OK\r\nCall-ID: lab\r\nCSeq: 1 INVITE\r\nContent-Type: application/sdp\r\n\r\nv=0\r\nm=audio ${port} RTP/AVP 0\r\n`, rinfo.port, rinfo.address);
    });
    caller.on("message", (msg, rinfo) => {
      const text = msg.toString("utf8");
      if (text.includes("403")) {
        finish(labResult({ ok: false, code: "SIP_FORBIDDEN", direction: "inbound", routedTo: null, connected: false }));
      } else if (text.includes("m=audio")) {
        const port = Number(text.match(/m=audio (\d+)/)[1]);
        caller.send(rtpPacket(payload), port, "127.0.0.1");
        caller.send("ACK sip:lab SIP/2.0\r\nCall-ID: lab\r\nCSeq: 1 ACK\r\n\r\n", rinfo.port, rinfo.address);
      }
    });
    media.bind(0, "127.0.0.1", () => {
      callee.bind(0, "127.0.0.1", () => {
        caller.bind(0, "127.0.0.1", () => {
          caller.send("INVITE sip:zeynep@127.0.0.1 SIP/2.0\r\nCall-ID: lab\r\nCSeq: 1 INVITE\r\n\r\nv=0\r\n", callee.address().port, "127.0.0.1");
        });
      });
    });
  });
}

function phoneStackStatus() {
  const config = path.join(process.cwd(), "deploy", "sip", "freeswitch-local.xml");
  return {
    freeswitchInstalled: commandExists("freeswitch"),
    freeswitchRunning: false,
    configPrepared: fs.existsSync(config),
    phoneLine: "BLOCKED_EXTERNAL",
    operatorAccount: false,
    paidApi: false,
    srtp: false,
    rtpLab: true,
  };
}

module.exports = { localSipCall, localSipBusy, localSipInbound, phoneStackStatus, isRtp };
