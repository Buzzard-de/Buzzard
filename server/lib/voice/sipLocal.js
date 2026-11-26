/**
 * Local SIP and RTP loopback. This does not place a carrier call.
 */
const dgram = require("dgram");

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
      if (msg.length >= 12 && msg[0] === 0x80) rtp += 1;
    });
    callee.on("message", (msg, rinfo) => {
      const text = msg.toString("utf8");
      if (text.startsWith("INVITE")) {
        const port = media.address().port;
        const ok = `SIP/2.0 200 OK\r\nCSeq: 1 INVITE\r\nContent-Type: application/sdp\r\n\r\nv=0\r\nm=audio ${port} RTP/AVP 0\r\n`;
        callee.send(ok, rinfo.port, rinfo.address);
      } else if (text.startsWith("BYE")) {
        callee.send("SIP/2.0 200 OK\r\nCSeq: 2 BYE\r\n\r\n", rinfo.port, rinfo.address);
      }
    });
    caller.on("message", (msg, rinfo) => {
      const text = msg.toString("utf8");
      if (text.includes("m=audio")) {
        const port = Number(text.match(/m=audio (\d+)/)[1]);
        caller.send(rtpPacket(payload), port, "127.0.0.1");
        caller.send("BYE sip:lab SIP/2.0\r\nCSeq: 2 BYE\r\n\r\n", rinfo.port, rinfo.address);
      } else if (text.includes("CSeq: 2 BYE")) {
        finish({
          ok: rtp === 1,
          rtpPackets: rtp,
          sip: true,
          media: "RTP",
          srtp: false,
          carrier: false,
          placedOnCarrier: false,
          network: "LOOPBACK",
          paid: false,
        });
      }
    });
    media.bind(0, "127.0.0.1", () => {
      callee.bind(0, "127.0.0.1", () => {
        caller.bind(0, "127.0.0.1", () => {
          const invite = "INVITE sip:lab@127.0.0.1 SIP/2.0\r\nCSeq: 1 INVITE\r\nContent-Type: application/sdp\r\n\r\nv=0\r\n";
          caller.send(invite, callee.address().port, "127.0.0.1");
        });
      });
    });
  });
}

module.exports = { localSipCall };
