"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchAiCenterOverview,
  fetchAiCenterStatus,
  fetchAiJobs,
  sendAiCenterChat,
} from "@/lib/aiCenter/client";
import type { AiCenterOverview, AiCenterStatus, AiJobRow } from "@/lib/aiCenter/types";

const MODULES = [
  "AI Chatbot",
  "Product recommendations",
  "Product copy",
  "Translation",
  "Review sentiment",
  "Smart search",
  "Support drafts",
  "Human handoff",
  "AI audit log",
  "Prompt versions",
];

export default function AdminAiCenterPanel() {
  const [status, setStatus] = useState<AiCenterStatus | null>(null);
  const [overview, setOverview] = useState<AiCenterOverview | null>(null);
  const [jobs, setJobs] = useState<AiJobRow[]>([]);
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatting, setChatting] = useState(false);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, jobRows] = await Promise.all([
      fetchAiCenterStatus(),
      fetchAiCenterOverview(),
      fetchAiJobs(),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setJobs(jobRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "aiCenter.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  async function handleChat() {
    if (!message.trim()) return;
    setChatting(true);
    setError("");
    try {
      const result = await sendAiCenterChat(message, "de");
      setAnswer(result.answer);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "aiCenter.requestFailed");
    } finally {
      setChatting(false);
    }
  }

  if (loading) return <p>Lade AI Center…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>AI Center v2.8</h1>
        <p>AI orchestration for chat, recommendations, copy, translation, sentiment and smart search</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Sessions", overview.sessions],
            ["Messages", overview.messages],
            ["AI jobs", overview.jobs],
            ["Completed", overview.completedJobs],
            ["Human handoffs", overview.handoffs],
            ["Active prompts", overview.prompts],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      <section className="admin-card">
        <h2>AI Assistant</h2>
        <div className="admin-toolbar">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask Buzzard AI…"
            rows={3}
            aria-label="AI message"
          />
          <button type="button" className="btn-secondary" disabled={chatting} onClick={handleChat}>
            {chatting ? "Sending…" : "Send"}
          </button>
        </div>
        {answer && (
          <p className="admin-meta">
            <strong>Answer:</strong> {answer}
          </p>
        )}
      </section>

      <section className="admin-card">
        <h2>AI modules</h2>
        <div className="admin-flow">
          {MODULES.map((item) => (
            <span key={item} className="admin-tag">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-toolbar">
          <button type="button" className="btn-secondary" onClick={() => reload().catch(() => undefined)}>
            Refresh
          </button>
        </div>
        <h2>Recent AI jobs</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Entity</th>
                <th>Model</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, 10).map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.job_type}</strong>
                  </td>
                  <td>
                    {row.entity_type} · {row.entity_id || "—"}
                  </td>
                  <td>{row.model}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {status && (
        <section className="admin-card admin-meta">
          <p>
            Module v{status.version} · provider {status.provider} · handoff to v2.4 CRM, v2.7 reviews, catalog/search
          </p>
        </section>
      )}
    </div>
  );
}
