"use client";

import { useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";

type Dashboard = {
  flags?: Record<string, boolean>;
  providers?: Record<string, string>;
  voiceSessions?: unknown[];
  calls?: unknown[];
  handoffs?: unknown[];
  pendingApprovals?: number;
  costs?: unknown;
  real?: { stt?: boolean; tts?: boolean; phone?: boolean };
};

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
        else setDash(data.dashboard);
      })
      .catch(() => setError("Fehler"));
  }, []);

  return (
    <section className="admin-panel" data-orch-admin="1">
      <h1>Orchestrator Control Center</h1>
      {error ? <p>{error}</p> : null}
      {dash ? (
        <div>
          <p>STT: {dash.providers?.stt || "n/a"}</p>
          <p>TTS: {dash.providers?.tts || "n/a"}</p>
          <p>Phone: {dash.providers?.telephony || "n/a"}</p>
          <p>WebRTC: {dash.providers?.webrtc || "n/a"}</p>
          <p>Active sessions: {Array.isArray(dash.voiceSessions) ? dash.voiceSessions.length : 0}</p>
          <p>Active calls: {Array.isArray(dash.calls) ? dash.calls.length : 0}</p>
          <p>Handoffs: {Array.isArray(dash.handoffs) ? dash.handoffs.length : 0}</p>
          <p>Approvals pending: {dash.pendingApprovals || 0}</p>
          <p>Real STT: {dash.real?.stt ? "YES" : "NO"}</p>
          <p>Real TTS: {dash.real?.tts ? "YES" : "NO"}</p>
          <p>Real Phone: {dash.real?.phone ? "YES" : "NO"}</p>
          <pre>{JSON.stringify(dash.flags, null, 2)}</pre>
        </div>
      ) : null}
    </section>
  );
}
