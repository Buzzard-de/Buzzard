/**
 * Local WebRTC media on the existing signaling path.
 * Host candidates only. No paid TURN server.
 */
const { RTCPeerConnection, MediaStreamTrack, RtpPacket, RtpHeader } = require("werift");

function waitGather(pc) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const sub = pc.iceGatheringStateChange.subscribe((state) => {
      if (state === "complete") {
        sub.unSubscribe();
        resolve();
      }
    });
  });
}

async function exchange(payload) {
  const left = new RTCPeerConnection({ iceServers: [] });
  const right = new RTCPeerConnection({ iceServers: [] });
  const track = new MediaStreamTrack({ kind: "audio" });
  left.addTrack(track);
  let remote = null;
  right.onTrack.subscribe((event) => {
    remote = event.track || event;
  });
  await left.setLocalDescription(await left.createOffer());
  await waitGather(left);
  await right.setRemoteDescription(left.localDescription);
  await right.setLocalDescription(await right.createAnswer());
  await waitGather(right);
  await left.setRemoteDescription(right.localDescription);
  const connected = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(left.connectionState === "connected"), 2500);
    if (left.connectionStateChange && left.connectionStateChange.subscribe) {
      const sub = left.connectionStateChange.subscribe((state) => {
        if (state === "connected" || state === "failed") {
          clearTimeout(timer);
          sub.unSubscribe();
          resolve(state === "connected");
        }
      });
    }
  });
  let received = null;
  if (remote) {
    remote.onReceiveRtp.subscribe((rtp) => {
      received = Buffer.from(rtp.payload);
    });
    const body = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload || "pcm"));
    track.writeRtp(new RtpPacket(new RtpHeader({
      payloadType: 111,
      sequenceNumber: 1,
      timestamp: 160,
      ssrc: 42,
    }), body));
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const result = {
    ok: connected && received && received.equals(Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload || "pcm"))),
    ice: left.iceConnectionState,
    connection: left.connectionState,
    dtls: left.connectionState === "connected",
    srtp: Boolean(received && received.length),
    packets: received ? 1 : 0,
    payload: received ? received.toString("utf8") : null,
    network: "LOOPBACK",
    internet: false,
    turn: false,
    paid: false,
    carrier: false,
  };
  left.close();
  right.close();
  return result;
}

async function loopbackMedia({ payload = Buffer.from("buzzard-pcm-frame"), reconnect = false } = {}) {
  const first = await exchange(payload);
  if (!reconnect) return first;
  const second = await exchange(Buffer.from(`${payload.toString("utf8")}-again`));
  return { ...first, reconnect: second.ok === true, second };
}

function readLines(socket) {
  let buf = "";
  const lines = [];
  const waiters = [];
  const push = (line) => {
    const parsed = JSON.parse(line);
    if (waiters.length) waiters.shift()(parsed);
    else lines.push(parsed);
  };
  socket.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    let cut = buf.indexOf("\n");
    while (cut >= 0) {
      push(buf.slice(0, cut));
      buf = buf.slice(cut + 1);
      cut = buf.indexOf("\n");
    }
  });
  return () => (lines.length ? Promise.resolve(lines.shift()) : new Promise((resolve) => waiters.push(resolve)));
}

function waitConnected(pc) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(pc.connectionState === "connected"), 4000);
    if (pc.connectionStateChange && pc.connectionStateChange.subscribe) {
      const sub = pc.connectionStateChange.subscribe((state) => {
        if (state === "connected" || state === "failed") {
          clearTimeout(timer);
          sub.unSubscribe();
          resolve(state === "connected");
        }
      });
    }
  });
}

async function twoProcessMedia({ payload = Buffer.from("buzzard-pcm-frame") } = {}) {
  const net = require("net");
  const { fork } = require("child_process");
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const child = fork(__filename, [], {
    env: { ...process.env, BUZZARD_RTC_PEER: "B", BUZZARD_RTC_PORT: String(port) },
    stdio: "ignore",
  });
  const socket = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("PEER_TIMEOUT")), 5000);
    server.once("connection", (conn) => {
      clearTimeout(timer);
      resolve(conn);
    });
  });
  const next = readLines(socket);
  const left = new RTCPeerConnection({ iceServers: [] });
  const track = new MediaStreamTrack({ kind: "audio" });
  left.addTrack(track);
  await left.setLocalDescription(await left.createOffer());
  await waitGather(left);
  socket.write(`${JSON.stringify({ type: "offer", sdp: left.localDescription })}\n`);
  const answer = await next();
  await left.setRemoteDescription(answer.sdp);
  const connected = await waitConnected(left);
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload));
  track.writeRtp(new RtpPacket(new RtpHeader({
    payloadType: 111,
    sequenceNumber: 7,
    timestamp: 320,
    ssrc: 77,
  }), body));
  const result = await next();
  try { socket.end(); } catch { /* closed */ }
  try { child.kill(); } catch { /* already exited */ }
  server.close();
  left.close();
  const heard = result && result.payload === body.toString("utf8");
  return {
    ok: connected && heard,
    clients: 2,
    processes: 2,
    ice: left.iceConnectionState,
    connection: left.connectionState,
    dtls: heard,
    srtp: heard,
    payload: result ? result.payload : null,
    network: "LOOPBACK",
    internet: false,
    turn: false,
    paid: false,
    carrier: false,
  };
}

function peerChild() {
  const net = require("net");
  const socket = net.connect(Number(process.env.BUZZARD_RTC_PORT), "127.0.0.1");
  const next = readLines(socket);
  const send = (obj) => socket.write(`${JSON.stringify(obj)}\n`);
  next().then(async (offer) => {
    const pc = new RTCPeerConnection({ iceServers: [] });
    let remote = null;
    pc.onTrack.subscribe((event) => {
      remote = event.track || event;
    });
    await pc.setRemoteDescription(offer.sdp);
    await pc.setLocalDescription(await pc.createAnswer());
    await waitGather(pc);
    send({ type: "answer", sdp: pc.localDescription });
    await waitConnected(pc);
    const heard = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 2500);
      if (!remote || !remote.onReceiveRtp) return;
      remote.onReceiveRtp.subscribe((rtp) => {
        clearTimeout(timer);
        resolve(Buffer.from(rtp.payload).toString("utf8"));
      });
    });
    send({ type: "result", payload: heard });
    pc.close();
    socket.end();
    setTimeout(() => process.exit(0), 50);
  }).catch(() => process.exit(1));
}

if (process.env.BUZZARD_RTC_PEER === "B") peerChild();

module.exports = { loopbackMedia, twoProcessMedia };
