"use client";

import { useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";

type InspectRow = {
  provider?: string;
  configured?: boolean;
  wired?: boolean;
  status?: string;
  liveOk?: boolean;
  iceConfigured?: boolean;
};

type Dashboard = {
  flags?: Record<string, boolean>;
  inspect?: { stt?: InspectRow; tts?: InspectRow; telephony?: InspectRow; webrtc?: InspectRow };
  voiceSessions?: unknown[];
  calls?: unknown[];
  handoffs?: unknown[];
  pendingApprovals?: number;
  costs?: unknown;
  real?: { stt?: boolean; tts?: boolean; phone?: boolean };
  production?: { realSttActive?: boolean; realTtsActive?: boolean; realPhoneActive?: boolean };
};

function label(row?: InspectRow) {
  if (!row) return "UNKNOWN";
  if (!row.configured) return "NOT CONFIGURED";
  if (row.wired === false) return "NOT WIRED";
  return row.status || "CONFIGURED";
}

export default function AdminOrchestratorPanel() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setError("Nicht angemeldet");
      return;
    }
    fetch("/api/admin/orchestrator/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) setError(data.code || "Fehler");
        else setDash({ ...data.dashboard, inspect: data.inspect || data.dashboard?.inspect });
      })
      .catch(() => setError("Fehler"));
  }, []);

  const stt = label(dash?.inspect?.stt);
  const tts = label(dash?.inspect?.tts);
  const phone = label(dash?.inspect?.telephony);
  const rtc = label(dash?.inspect?.webrtc);

  return (
    <section className="admin-panel" data-orch-admin="1">
      <h1>Orchestrator Control Center</h1>
      {error ? <p>{error}</p> : null}
      {dash ? (
        <div>
          <p>STT: {stt}</p>
          <p>TTS: {tts}</p>
          <p>Phone: {phone}</p>
          <p>WebRTC: {rtc}</p>
          <p>Active sessions: {Array.isArray(dash.voiceSessions) ? dash.voiceSessions.length : 0}</p>
          <p>Active calls: {Array.isArray(dash.calls) ? dash.calls.length : 0}</p>
          <p>Handoffs: {Array.isArray(dash.handoffs) ? dash.handoffs.length : 0}</p>
          <p>Approvals pending: {dash.pendingApprovals || 0}</p>
          <p>Real STT: {dash.production?.realSttActive || dash.real?.stt ? "YES" : "NO"}</p>
          <p>Real TTS: {dash.production?.realTtsActive || dash.real?.tts ? "YES" : "NO"}</p>
          <p>Real Phone: {dash.production?.realPhoneActive || dash.real?.phone ? "YES" : "NO"}</p>
          <pre>{JSON.stringify(dash.flags, null, 2)}</pre>
          <pre>{JSON.stringify(dash.inspect, null, 2)}</pre>
        </div>
      ) : null}
    </section>
  );
}
