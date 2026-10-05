"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { isRtlLocale } from "@/lib/i18n";
import "@/styles/embodied-office.css";

type ObjectRow = { id: string; type: string; zone: string; position: { x: number; y: number; z: number }; state?: string };
type Session = {
  id: string;
  state: string;
  character?: { position?: { x: number; z: number }; attentionTarget?: string };
  objects?: ObjectRow[];
  liveAvatar?: boolean;
  renderer?: string;
  provider?: { code?: string };
  activity?: string;
  userStatus?: string;
  fallback?: { mode?: string; live?: boolean };
  debug?: unknown;
};

const CAMERAS = ["FRONT", "MEDIUM", "CLOSE", "FOLLOW", "DESK", "CABINET", "SCREEN", "LEFT", "RIGHT", "BACK", "OVERHEAD"];

function pct(value: number, max = 10) {
  return `${Math.min(95, Math.max(4, (value / max) * 100))}%`;
}

export default function PusatOffice() {
  const { locale } = useLocale();
  const rtl = isRtlLocale(locale);
  const [enabled, setEnabled] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [camera, setCamera] = useState("FRONT");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [note, setNote] = useState("");
  const [connection, setConnection] = useState("offline");
  const [voiceCode, setVoiceCode] = useState("BLOCKED_BY_PROVIDER_CONFIGURATION");

  useEffect(() => {
    fetch("/api/health/embodied")
      .then((res) => res.json())
      .then((data) => {
        setEnabled(Boolean(data?.embodied?.flags?.EMBODIED_AI_ENABLED));
        setNote(data?.embodied?.fallback?.userStatus || data?.avatar?.code || "Avatar service unavailable");
        setVoiceCode(data?.embodied?.code || "BLOCKED_BY_PROVIDER_CONFIGURATION");
        setConnection(data?.embodied?.realAvatarActive ? "connected" : "provider-unavailable");
      })
      .catch(() => setEnabled(false));
  }, []);

  async function start() {
    const res = await fetch("/api/orchestrator/embodied/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: locale.slice(0, 2) }),
    });
    const data = await res.json();
    if (data.session) {
      setSession(data.session);
      setConnection("connected");
    } else {
      setConnection("provider-unavailable");
    }
    setNote(data.code || data.session?.provider?.code || "");
  }

  async function send() {
    if (!session || !message.trim()) return;
    const res = await fetch(`/api/orchestrator/embodied/session/${session.id}/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, language: locale.slice(0, 2) }),
    });
    const data = await res.json();
    if (data.session) setSession(data.session);
    setReply(data.orchestrator?.reply || data.reply || "");
    if (data.direction?.camera) setCamera(data.direction.camera);
    setMessage("");
    if (data.orchestrator?.approval?.required || data.session?.state === "WAITING") {
      setNote("WAITING_APPROVAL");
    }
  }

  async function listen() {
    if (!session || muted) return;
    setConnection("listening");
    const realtime = await fetch("/api/orchestrator/voice/realtime/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: locale.slice(0, 2) }),
    });
    const realtimeData = await realtime.json();
    if (realtimeData.ephemeralKey && navigator.mediaDevices?.getUserMedia) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setVoiceCode("CONNECTING");
        setNote("OpenAI realtime ephemeral session");
      } catch {
        setConnection("provider-unavailable");
      }
    }
    const res = await fetch(`/api/orchestrator/embodied/session/${session.id}/realtime`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: true, language: locale.slice(0, 2), energy: 0.2, speaking: true }),
    });
    const data = await res.json();
    if (data.session) setSession(data.session);
    setVoiceCode(data.claims?.REAL_STT_ACTIVE ? "OK" : data.code || realtimeData.code || "BLOCKED_BY_PROVIDER_CONFIGURATION");
    setNote(data.code || realtimeData.code || "STT unavailable");
    setConnection(data.ok ? "speaking" : realtimeData.ok ? "connecting" : "provider-unavailable");
  }

  async function end() {
    setSession(null);
    setReply("");
    setConnection("offline");
  }

  const objects = session?.objects || [];
  const avatarPos = session?.character?.position || { x: 5, z: 3.2 };
  const quality = "adaptive";

  return (
    <section
      className={`pusat-office${enabled ? " pusat-office--enabled" : ""}`}
      dir={rtl ? "rtl" : "ltr"}
      data-pusat-office="1"
      data-camera={camera}
      data-live-avatar={session?.liveAvatar ? "true" : "false"}
      data-live-video="false"
      data-renderer={session?.renderer || "CSS_3D_FALLBACK"}
      data-quality={quality}
      data-connection={connection}
      data-listening={connection === "listening" ? "true" : "false"}
      data-provider-unavailable={connection === "provider-unavailable" ? "true" : "false"}
      data-approval={note === "WAITING_APPROVAL" ? "true" : "false"}
    >
      <div className="pusat-office__bar">
        <h1>Pusat Living Office</h1>
        <p className="pusat-office__status" data-state={session?.state || "OFFLINE"} aria-live="polite">
          {session?.activity || session?.state || "OFFLINE"} · {session?.fallback?.mode || "CSS_3D_FALLBACK"}
        </p>
      </div>
      <ul className="pusat-office__chips" aria-label="Session status">
        <li data-chip="connection">{connection}</li>
        <li data-chip="listening">{connection === "listening" ? "LISTENING" : "IDLE"}</li>
        <li data-chip="thinking">{session?.state === "THINKING" ? "THINKING" : "—"}</li>
        <li data-chip="speaking">{session?.state === "SPEAKING" ? "SPEAKING" : "—"}</li>
        <li data-chip="handoff">{session?.state === "HANDOFF" ? "HANDOFF" : "—"}</li>
        <li data-chip="approval">{note === "WAITING_APPROVAL" ? "WAITING_APPROVAL" : "—"}</li>
        <li data-chip="voice">{voiceCode}</li>
      </ul>
      <div className="pusat-office__fallback" role="status">
        {note || "Avatar service unavailable"}. Real-time avatar: {session?.liveAvatar ? "YES" : "NO"}.
      </div>
      <div className="pusat-office__stage">
        <div className="pusat-office__room" data-camera={camera}>
          {objects.map((obj) => (
            <div
              key={obj.id}
              className="pusat-office__object"
              data-object-id={obj.id}
              data-zone={obj.zone}
              style={{ left: pct(obj.position.x), top: pct(obj.position.z) }}
            >
              {obj.id}
            </div>
          ))}
          <div
            className="pusat-office__avatar"
            data-avatar="pusat"
            data-expression="neutral"
            style={{ left: pct(avatarPos.x), top: pct(avatarPos.z || 3.2) }}
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="pusat-office__controls">
        {CAMERAS.map((name) => (
          <button key={name} type="button" onClick={() => setCamera(name)} data-camera-btn={name}>
            {name}
          </button>
        ))}
        <button type="button" onClick={start} disabled={!enabled}>
          Start
        </button>
        <button type="button" onClick={() => void listen()} disabled={!session || muted} data-mic>
          Microphone
        </button>
        <button type="button" onClick={() => setMuted((v) => !v)} data-mute aria-pressed={muted}>
          {muted ? "Unmute" : "Mute"}
        </button>
        <button type="button" aria-pressed={!muted} data-speaker>
          Speaker
        </button>
        <button type="button" onClick={() => setCameraOn((v) => !v)} data-user-camera aria-pressed={cameraOn}>
          {cameraOn ? "Camera off" : "Camera on"}
        </button>
        <button type="button" onClick={end}>
          End
        </button>
      </div>
      <div className="pusat-office__controls">
        <textarea
          aria-label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Text to Pusat"
        />
        <button type="button" onClick={send} disabled={!session}>
          Send
        </button>
      </div>
      {reply ? <p className="pusat-office__status">{reply}</p> : null}
      <audio data-remote-audio hidden />
      {session?.debug ? <pre className="pusat-office__debug">{JSON.stringify(session.debug, null, 2)}</pre> : null}
    </section>
  );
}
