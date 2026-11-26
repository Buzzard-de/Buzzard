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

async function gatherCandidates({ stun = null } = {}) {
  const pc = new RTCPeerConnection({ iceServers: stun ? [{ urls: stun }] : [] });
  pc.addTrack(new MediaStreamTrack({ kind: "audio" }));
  const found = [];
  pc.onIceCandidate.subscribe((candidate) => {
    if (candidate?.candidate) found.push(String(candidate.candidate));
  });
  let failed = false;
  if (pc.onIceCandidateError) {
    pc.onIceCandidateError.subscribe(() => {
      failed = true;
    });
  }
  await pc.setLocalDescription(await pc.createOffer());
  await Promise.race([
    waitGather(pc),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]);
  pc.close();
  const count = (token) => found.filter((line) => line.includes(` typ ${token}`)).length;
  const srflx = count("srflx");
  const relay = count("relay");
  const host = count("host");
  return {
    ok: host > 0,
    code: relay > 0 ? "TURN_PROBE" : srflx > 0 ? (stun ? "STUN_PROBE" : "REFLEXIVE_SEEN") : stun ? "STUN_UNREACHABLE" : "HOST_ONLY",
    host,
    srflx,
    relay,
    failed,
    candidates: found.length,
    stun: Boolean(stun),
    turn: relay > 0,
    turnInstalled: false,
    media: false,
    dtls: false,
    srtp: false,
    secure: false,
    internet: false,
    network: stun ? "STUN_PROBE" : "HOST_ONLY",
    paid: false,
    carrier: false,
  };
}

async function twoProcessMedia({ payload = Buffer.from("buzzard-pcm-frame"), reconnect = false, packets = 1 } = {}) {
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
  const copies = Math.max(1, Number(packets) || 1);
  for (let i = 0; i < copies; i += 1) {
    track.writeRtp(new RtpPacket(new RtpHeader({
      payloadType: 111,
      sequenceNumber: 7 + i,
      timestamp: 320 + i * 160,
      ssrc: 77,
    }), body));
  }
  const result = await next();
  const deadline = Date.now() + 1500;
  while (Date.now() < deadline && left.connectionState !== "connected") {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  try { socket.end(); } catch { /* closed */ }
  try { child.kill(); } catch { /* already exited */ }
  server.close();
  const heard = result && result.payload === body.toString("utf8");
  const parentState = left.connectionState;
  const parentIce = left.iceConnectionState;
  const parentConnected = parentState === "connected";
  const peerConnected = result?.connection === "connected";
  left.close();
  const session = {
    ok: parentConnected && peerConnected && heard,
    sessionId: `rtc_${port}`,
    clients: 2,
    processes: 2,
    ice: parentIce,
    connection: parentState,
    peerConnection: result?.connection || null,
    peerIce: result?.ice || null,
    dtls: parentConnected && peerConnected,
    srtp: heard,
    secure: parentConnected && peerConnected && heard,
    payload: result ? result.payload : null,
    packets: Number(result?.packets || 0),
    sent: copies,
    loss: Math.max(0, copies - Number(result?.packets || 0)),
    network: "LOOPBACK",
    internet: false,
    turn: false,
    paid: false,
    carrier: false,
  };
  if (!reconnect) return session;
  const second = await twoProcessMedia({ payload: Buffer.from(`${body.toString("utf8")}-again`), reconnect: false });
  return { ...session, reconnect: second.ok === true, secondSessionId: second.sessionId };
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
      let count = 0;
      let payloadText = null;
      let quiet = null;
      const stop = setTimeout(() => resolve({ payload: payloadText, count }), 2500);
      if (!remote || !remote.onReceiveRtp) return;
      remote.onReceiveRtp.subscribe((rtp) => {
        count += 1;
        payloadText = Buffer.from(rtp.payload).toString("utf8");
        if (quiet) clearTimeout(quiet);
        quiet = setTimeout(() => {
          clearTimeout(stop);
          resolve({ payload: payloadText, count });
        }, 300);
      });
    });
    send({
      type: "result",
      payload: heard.payload,
      packets: heard.count,
      connection: pc.connectionState,
      ice: pc.iceConnectionState,
    });
    pc.close();
    socket.end();
    setTimeout(() => process.exit(0), 50);
  }).catch(() => process.exit(1));
}

if (process.env.BUZZARD_RTC_PEER === "B") peerChild();

function commandExists(name) {
  const { spawnSync } = require("child_process");
  const ran = spawnSync("which", [name], { encoding: "utf8" });
  return ran.status === 0 && Boolean(String(ran.stdout || "").trim());
}

function internetCallStatus() {
  const turnInstalled = commandExists("turnserver");
  return {
    status: "BLOCKED_EXTERNAL",
    verified: false,
    internet: false,
    media: false,
    dtls: false,
    srtp: false,
    secure: false,
    turnInstalled,
    coturnPackage: "coturn",
    coturnInstall: [
      "apt-get install coturn",
      "listen on an address the two peers can reach",
      "set a long-term credential",
      "do not open an unauthenticated public relay",
    ],
    reason: "TWO_SEPARATE_INTERNET_ENDPOINTS_REQUIRED",
    paidTurn: false,
    carrier: false,
  };
}

module.exports = { loopbackMedia, twoProcessMedia, gatherCandidates, internetCallStatus };
