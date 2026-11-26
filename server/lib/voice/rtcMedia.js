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

module.exports = { loopbackMedia };
