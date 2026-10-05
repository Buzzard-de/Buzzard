"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { isRtlLocale } from "@/lib/i18n";
import "@/styles/orchestrator-voice.css";

type Health = {
  orchestrator?: {
    flags?: { PHONE_ENABLED?: boolean };
    realPhoneActive?: boolean;
  };
};

export default function CallControl() {
  const { locale } = useLocale();
  const rtl = isRtlLocale(locale);
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [state, setState] = useState("CREATED");
  const [note, setNote] = useState("Not connected");

  useEffect(() => {
    fetch("/api/health/orchestrator")
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  const enabled = Boolean(health?.orchestrator?.flags?.PHONE_ENABLED);
  if (!health || !enabled) return null;

  async function startCall() {
    const res = await fetch("/api/orchestrator/phone/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: locale.slice(0, 2) }),
    });
    const data = await res.json();
    if (!data.success) {
      setState("FAILED");
      setNote(data.code || "PHONE_PROVIDER_NOT_CONFIGURED");
      return;
    }
    setState(data.call?.call_state || data.call?.status || "RINGING");
    setNote(data.call?.id || "connected");
  }

  async function transfer() {
    const res = await fetch("/api/orchestrator/phone/handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "PHONE", locale: locale.slice(0, 2) }),
    });
    const data = await res.json();
    setState(data.status || "HANDOFF");
    setNote(data.mode || "");
  }

  return (
    <div className="orch-call-shell" dir={rtl ? "rtl" : "ltr"} data-orch-call="1">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Call
      </button>
      <div className="orch-call-panel" hidden={!open}>
        <div className="orch-call-status" data-state={state}>
          {state}
        </div>
        <div className="orch-call-actions">
          <button type="button" onClick={startCall}>
            Calling
          </button>
          <button type="button" onClick={transfer}>
            Transfer
          </button>
          <button type="button" onClick={() => setState("COMPLETED")}>
            End
          </button>
        </div>
        <p className="orch-call-note">{note}</p>
      </div>
    </div>
  );
}
