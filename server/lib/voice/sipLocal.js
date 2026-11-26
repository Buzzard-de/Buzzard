/**
 * Local SIP and RTP loopback. This does not place a carrier call.
 */
const dgram = require("dgram");
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
          turnInstalled: false,
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

module.exports = { localSipCall, isRtp };
