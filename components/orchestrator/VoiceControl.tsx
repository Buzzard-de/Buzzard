"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { isRtlLocale } from "@/lib/i18n";
import "@/styles/orchestrator-voice.css";

type Health = {
  success?: boolean;
  orchestrator?: {
    flags?: { VOICE_ENABLED?: boolean; VOICE_WEBRTC_ENABLED?: boolean };
    providers?: { stt?: string; tts?: string };
  };
};

export default function VoiceControl() {
  const { locale } = useLocale();
  const rtl = isRtlLocale(locale);
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [state, setState] = useState("CREATED");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/health/orchestrator")
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  const enabled = Boolean(health?.orchestrator?.flags?.VOICE_ENABLED);
  if (!health || !enabled) return null;

  async function start() {
    setState("CONNECTING");
    const res = await fetch("/api/orchestrator/voice/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: locale.slice(0, 2) }),
    });
    const data = await res.json();
    if (!data.success || !data.session?.id) {
      setState("FAILED");
      setNote(data.code || "VOICE_SESSION_FAILED");
      return;
    }
    setSessionId(data.session.id);
    setState(data.session.state || "CONNECTING");
    setNote("");
  }

  async function pushToTalk() {
    if (!sessionId) return;
    const res = await fetch("/api/orchestrator/voice/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: locale.slice(0, 2) }),
    });
    const data = await res.json();
    setState(data.ok ? "THINKING" : "FAILED");
    setNote(data.code || data.transcript || "");
  }

  async function bargeIn() {
    if (!sessionId) return;
    const res = await fetch(`/api/orchestrator/voice/session/${sessionId}/barge-in`, { method: "POST" });
    const data = await res.json();
    setState(data.state || "INTERRUPTED");
  }

  return (
    <div className="orch-voice-shell" dir={rtl ? "rtl" : "ltr"} data-orch-voice="1">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Voice
      </button>
      <div className="orch-voice-panel" hidden={!open}>
        <div className="orch-voice-status" data-state={state}>
          {state}
        </div>
        <div className="orch-voice-actions">
          <button type="button" onClick={start}>
            Start
          </button>
          <button type="button" onClick={pushToTalk} disabled={!sessionId}>
            Listening
          </button>
          <button type="button" onClick={bargeIn} disabled={!sessionId}>
            Interrupt
          </button>
          <button type="button" onClick={() => setState("ENDED")} disabled={!sessionId}>
            End
          </button>
        </div>
        <p className="orch-voice-note">{note || (sessionId ? `session ${sessionId}` : "Not connected")}</p>
      </div>
    </div>
  );
}
