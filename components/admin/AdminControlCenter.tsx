"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  createAiTask,
  decideApproval,
  fetchActivity,
  fetchAiEmployees,
  fetchAiTasks,
  fetchApprovals,
  fetchCategoryVisibility,
  fetchControlCenterStatus,
  fetchDashboardSummary,
  fetchIntegrations,
  globalAdminSearch,
  updateCategoryVisibility,
} from "@/lib/admin/controlCenter";
import {
  cancelJob,
  enqueueSync,
  fetchAutomationJobs,
  fetchAutomationOverview,
  fetchIntegrationHealth,
  fetchSchedules,
  retryJob,
  workerAction,
} from "@/lib/admin/automation";
import type { BackgroundJob, Schedule, WorkerState } from "@/lib/admin/automationTypes";
import type {
  ActivityEvent,
  AiEmployee,
  AiTask,
  Approval,
  ControlCenterStatus,
  DashboardSummary,
  Integration,
} from "@/lib/admin/controlCenterTypes";
import {
  approveGoLive,
  fetchCommerceOverview,
  fetchCommerceSecurityEvents,
  requestGoLive,
} from "@/lib/admin/commerce";
import type { CommerceFeatureFlags, CommerceHealth, CommerceReadiness, GoLiveRequest } from "@/lib/admin/commerceTypes";
import { getMainCategories } from "@/lib/categories";

type Tab =
  | "overview"
  | "ai"
  | "tasks"
  | "approvals"
  | "categories"
  | "integrations"
  | "activity"
  | "automation"
  | "workers"
  | "schedules"
  | "sync"
  | "commerce";

const STATUS_CLASS: Record<string, string> = {
  ONLINE: "cc-status-online",
  WARNING: "cc-status-warning",
  OFFLINE: "cc-status-offline",
  UNKNOWN: "cc-status-unknown",
};

export default function AdminControlCenter() {
  const [tab, setTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<ControlCenterStatus | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [employees, setEmployees] = useState<AiEmployee[]>([]);
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [visibility, setVisibility] = useState<Record<string, { status: string; readiness?: Record<string, string> }>>({});
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Record<string, unknown> | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskEmployee, setNewTaskEmployee] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [worker, setWorker] = useState<WorkerState | null>(null);
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [jobCounts, setJobCounts] = useState<Record<string, number>>({});
  const [integrationHealth, setIntegrationHealth] = useState<Array<{ integrationCode: string; status: string; responseTimeMs: number | null }>>([]);
  const [commerceHealth, setCommerceHealth] = useState<CommerceHealth | null>(null);
  const [commerceReadiness, setCommerceReadiness] = useState<CommerceReadiness | null>(null);
  const [commerceFlags, setCommerceFlags] = useState<CommerceFeatureFlags | null>(null);
  const [commerceOrders, setCommerceOrders] = useState<Record<string, number>>({});
  const [goLiveRequests, setGoLiveRequests] = useState<GoLiveRequest[]>([]);
  const [commerceEvents, setCommerceEvents] = useState<Array<{ type: string; timestamp: string; severity: string }>>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, sum, emps, tsk, appr, integ, act, vis, auto] = await Promise.all([
        fetchControlCenterStatus(),
        fetchDashboardSummary(),
        fetchAiEmployees(),
        fetchAiTasks(),
        fetchApprovals("PENDING"),
        fetchIntegrations(true),
        fetchActivity(25),
        fetchCategoryVisibility(),
        fetchAutomationOverview().catch(() => null),
      ]);
      setStatus(st);
      setSummary(sum);
      setEmployees(emps);
      setTasks(tsk);
      setApprovals(appr);
      setIntegrations(integ);
      setActivity(act);
      setVisibility(vis);
      if (auto) {
        setWorker(auto.worker);
        setJobCounts(auto.jobCounts);
        setIntegrationHealth(auto.integrations);
      }
      const [jobList, schedList, health] = await Promise.all([
        fetchAutomationJobs().catch(() => []),
        fetchSchedules().catch(() => []),
        fetchIntegrationHealth(true).catch(() => []),
      ]);
      setJobs(jobList);
      setSchedules(schedList);
      if (health.length) setIntegrationHealth(health);
      try {
        const commerce = await fetchCommerceOverview();
        setCommerceHealth(commerce.health);
        setCommerceReadiness(commerce.readiness);
        setCommerceFlags(commerce.flags);
        setCommerceOrders(commerce.ordersByType);
        setGoLiveRequests(commerce.goLiveRequests);
        const events = await fetchCommerceSecurityEvents().catch(() => []);
        setCommerceEvents(events);
      } catch {
        /* commerce module optional during load */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleCreateTask() {
    if (!newTaskTitle.trim()) return;
    await createAiTask({
      title: newTaskTitle.trim(),
      employeeId: newTaskEmployee || undefined,
      priority: "NORMAL",
      permissionsRequired: ["ai.execute"],
    });
    setNewTaskTitle("");
    await reload();
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQ.trim()) return;
    const results = await globalAdminSearch(searchQ.trim());
    setSearchResults(results);
  }

  async function handleCategoryStatus(categoryId: string, newStatus: string) {
    await updateCategoryVisibility(categoryId, newStatus);
    await reload();
  }

  const mainCategories = getMainCategories();

  return (
    <div className="admin-page cc-page">
      <div className="admin-page-head cc-head">
        <div>
          <h1>Control Center</h1>
          <p className="admin-note">Merkezi sistem, AI ve kategori yönetimi</p>
        </div>
        <button type="button" className="shop-btn-secondary" onClick={() => reload()}>
          Yenile
        </button>
      </div>

      {error && <p className="cc-error">{error}</p>}

      <form className="cc-search" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Global arama: ürün, görev, AI…"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          aria-label="Global search"
        />
        <button type="submit" className="shop-btn-primary">Ara</button>
      </form>
      {searchResults && (
        <pre className="cc-search-results">{JSON.stringify(searchResults, null, 2)}</pre>
      )}

      <nav className="cc-tabs" aria-label="Control center sections">
        {(
          [
            ["overview", "Durum"],
            ["ai", "AI Çalışanları"],
            ["tasks", "Görevler"],
            ["approvals", "Onaylar"],
            ["categories", "Kategoriler"],
            ["integrations", "Entegrasyonlar"],
            ["activity", "Aktivite"],
            ["automation", "Automation"],
            ["workers", "Workers"],
            ["schedules", "Schedules"],
            ["sync", "Sync"],
            ["commerce", "Commerce"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "cc-tab active" : "cc-tab"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {loading && <p className="admin-note">Yükleniyor…</p>}

      {!loading && tab === "overview" && status && summary && (
        <div className="cc-grid">
          <section className="admin-panel">
            <h2>Sistem Durumu</h2>
            <ul className="cc-status-list">
              {Object.entries(status.services).map(([name, svc]) => (
                <li key={name}>
                  <span className={STATUS_CLASS[svc.status] || "cc-status-unknown"}>{svc.status}</span>
                  <strong>{name}</strong>
                  <span>{svc.detail}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="admin-panel">
            <h2>Özet</h2>
            <div className="admin-stat-grid">
              <article className="admin-stat"><strong>{summary.aiEmployees}</strong><span>AI Çalışan</span></article>
              <article className="admin-stat"><strong>{summary.activeTasks}</strong><span>Aktif Görev</span></article>
              <article className="admin-stat"><strong>{summary.pendingApprovals}</strong><span>Bekleyen Onay</span></article>
              <article className="admin-stat"><strong>{summary.openEscalations}</strong><span>Eskalasyon</span></article>
            </div>
          </section>
        </div>
      )}

      {!loading && tab === "ai" && (
        <section className="admin-panel">
          <h2>AI Employee Center</h2>
          <div className="cc-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Departman</th>
                  <th>Durum</th>
                  <th>Görev</th>
                  <th>Yetkiler</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.name}</td>
                    <td>{emp.department}</td>
                    <td>{emp.status}</td>
                    <td>{emp.assignedTasks}</td>
                    <td>{emp.permissions.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && tab === "tasks" && (
        <section className="admin-panel">
          <h2>AI Task Center</h2>
          <div className="cc-form-row">
            <input
              type="text"
              placeholder="Yeni görev başlığı"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <select value={newTaskEmployee} onChange={(e) => setNewTaskEmployee(e.target.value)}>
              <option value="">AI seç (opsiyonel)</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <button type="button" className="shop-btn-primary" onClick={handleCreateTask}>Oluştur</button>
          </div>
          <div className="cc-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Başlık</th><th>AI</th><th>Öncelik</th><th>Durum</th></tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>{t.employeeId || "—"}</td>
                    <td>{t.priority}</td>
                    <td>{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && tab === "approvals" && (
        <section className="admin-panel">
          <h2>Human Approval Center</h2>
          {approvals.length === 0 && <p className="admin-note">Bekleyen onay yok.</p>}
          <ul className="admin-list">
            {approvals.map((a) => (
              <li key={a.id} className="cc-approval-item">
                <div>
                  <strong>{a.reason || a.resourceType}</strong>
                  <span> Risk: {a.riskLevel}</span>
                  <p>{a.aiRecommendation}</p>
                </div>
                <div className="cc-actions">
                  <button type="button" className="shop-btn-primary" onClick={() => decideApproval(a.id, "approve").then(reload)}>Onayla</button>
                  <button type="button" className="shop-btn-secondary" onClick={() => decideApproval(a.id, "reject").then(reload)}>Reddet</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && tab === "categories" && (
        <section className="admin-panel">
          <h2>Category Management</h2>
          <p className="admin-note">
            Admin tüm kategorileri görür. READY olmayan kategori satışa açılmaz (BUZZARD_SALES_ENABLED=0).
          </p>
          <div className="cc-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Kategori</th><th>Durum</th><th>Readiness</th><th>Blocker</th><th>İşlem</th></tr>
              </thead>
              <tbody>
                {mainCategories.slice(0, 30).map((cat) => {
                  const entry = visibility[cat.id];
                  const st = entry?.status || "ACTIVE";
                  const overall = entry?.readiness?.overall || "NOT_READY";
                  const blockers = entry?.readiness
                    ? Object.entries(entry.readiness)
                        .filter(([k, v]) => k !== "overall" && v !== "READY")
                        .map(([k, v]) => `${k}:${v}`)
                        .join(", ")
                    : "products, pricing, stock…";
                  return (
                    <tr key={cat.id}>
                      <td>{cat.name}</td>
                      <td>{st}</td>
                      <td className={overall === "READY" ? "cc-status-online" : overall === "BLOCKED" ? "cc-event-critical" : ""}>
                        {overall}
                      </td>
                      <td className="cc-muted">{overall === "READY" ? "—" : blockers || "—"}</td>
                      <td>
                        <select
                          value={st}
                          onChange={(e) => handleCategoryStatus(cat.id, e.target.value)}
                          aria-label={`Status for ${cat.name}`}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="HIDDEN">HIDDEN</option>
                          <option value="COMING_SOON">COMING_SOON</option>
                          <option value="DRAFT">DRAFT</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="admin-note">İlk 30 ana kategori gösteriliyor. Tam liste API: /api/admin/categories/visibility</p>
        </section>
      )}

      {!loading && tab === "integrations" && (
        <section className="admin-panel">
          <h2>Integration Center</h2>
          <ul className="cc-status-list">
            {integrations.map((i) => (
              <li key={i.id}>
                <span className={i.status === "CONNECTED" ? "cc-status-online" : "cc-status-offline"}>{i.status}</span>
                <strong>{i.name}</strong>
                <span>{i.type}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && tab === "activity" && (
        <section className="admin-panel">
          <h2>Activity Center</h2>
          <ul className="admin-list">
            {activity.map((ev) => (
              <li key={ev.id}>
                <strong>{ev.eventType}</strong> — {ev.summary}
                <span className="cc-muted"> {new Date(ev.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && tab === "automation" && (
        <section className="admin-panel">
          <h2>Automation Overview</h2>
          {worker && (
            <div className="admin-stat-grid">
              <article className="admin-stat"><strong>{worker.status}</strong><span>Worker</span></article>
              <article className="admin-stat"><strong>{worker.jobsProcessed}</strong><span>Processed</span></article>
              <article className="admin-stat"><strong>{jobCounts.QUEUED ?? 0}</strong><span>Queued</span></article>
              <article className="admin-stat"><strong>{jobCounts.FAILED ?? 0}</strong><span>Failed</span></article>
            </div>
          )}
        </section>
      )}

      {!loading && tab === "workers" && (
        <section className="admin-panel">
          <h2>Workers</h2>
          {worker && <p>Status: <strong>{worker.status}</strong> — ID: {worker.workerId || "—"}</p>}
          <div className="cc-actions">
            {(["start", "pause", "resume", "stop"] as const).map((a) => (
              <button key={a} type="button" className="shop-btn-secondary" onClick={() => workerAction(a).then(reload)}>
                {a}
              </button>
            ))}
          </div>
          <div className="cc-table-wrap">
            <table className="admin-table">
              <thead><tr><th>ID</th><th>Type</th><th>Status</th><th>Priority</th><th>ms</th><th>Aktion</th></tr></thead>
              <tbody>
                {jobs.slice(0, 20).map((j) => (
                  <tr key={j.id}>
                    <td><code>{j.id.slice(0, 12)}…</code></td>
                    <td>{j.jobType}</td>
                    <td>{j.status}</td>
                    <td>{j.priority}</td>
                    <td>{j.executionMs ?? "—"}</td>
                    <td>
                      {(j.status === "FAILED" || j.status === "DEAD_LETTER") && (
                        <button type="button" className="shop-btn-secondary" onClick={() => retryJob(j.id).then(reload)}>Retry</button>
                      )}
                      {["QUEUED", "RETRYING", "RUNNING"].includes(j.status) && (
                        <button type="button" className="shop-btn-secondary" onClick={() => cancelJob(j.id).then(reload)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && tab === "schedules" && (
        <section className="admin-panel">
          <h2>Schedules</h2>
          {schedules.length === 0 && <p className="admin-note">Keine Schedules.</p>}
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Type</th><th>Schedule</th><th>Next</th><th>Runs</th></tr></thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.jobType}</td>
                  <td>{s.scheduleType}</td>
                  <td>{s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : "—"}</td>
                  <td>{s.runCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {!loading && tab === "sync" && (
        <section className="admin-panel">
          <h2>Sync (Dry Run)</h2>
          <p className="admin-note">Foundation — no live supplier orders. Sales disabled.</p>
          <div className="cc-actions">
            {(["product", "price", "stock", "supplier"] as const).map((k) => (
              <button key={k} type="button" className="shop-btn-primary" onClick={() => enqueueSync(k).then(reload)}>
                {k} sync
              </button>
            ))}
          </div>
          <h3>Integration Health</h3>
          <ul className="cc-status-list">
            {integrationHealth.map((h) => (
              <li key={h.integrationCode}>
                <span className={h.status === "CONNECTED" ? "cc-status-online" : "cc-status-offline"}>{h.status}</span>
                <strong>{h.integrationCode}</strong>
                <span>{h.responseTimeMs != null ? `${h.responseTimeMs}ms` : "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && tab === "commerce" && (
        <section className="admin-panel">
          <h2>Commerce Readiness</h2>
          <p className="admin-note">
            Katalogmodus — BUZZARD_SALES_ENABLED=0. Checkout dry-run only; no real payments or supplier orders.
          </p>
          {commerceReadiness && (
            <div className="admin-stat-grid">
              <article className="admin-stat">
                <strong>{commerceReadiness.overall}</strong>
                <span>Overall</span>
              </article>
              <article className="admin-stat">
                <strong>{commerceReadiness.score}%</strong>
                <span>Score</span>
              </article>
              <article className="admin-stat">
                <strong>{commerceReadiness.failCount}</strong>
                <span>Blockers</span>
              </article>
              <article className="admin-stat">
                <strong>{commerceReadiness.warnCount}</strong>
                <span>Warnings</span>
              </article>
            </div>
          )}
          {commerceFlags && (
            <>
              <h3>Feature Flags</h3>
              <ul className="cc-status-list">
                <li>Sales: {commerceFlags.salesEnabled ? "ON" : "OFF"}</li>
                <li>Checkout: {commerceFlags.checkoutEnabled ? "ON" : "OFF"} (dry-run: {commerceFlags.checkoutDryRunOnly ? "yes" : "no"})</li>
                <li>Payment: {commerceFlags.paymentEnabled ? "ON" : "OFF"} (mock: {commerceFlags.mockPaymentOnly ? "yes" : "no"})</li>
                <li>Supplier orders: {commerceFlags.supplierOrdersEnabled ? "ON" : "OFF"}</li>
                <li>Stripe: {commerceFlags.stripeEnabled ? "ON" : "OFF"}</li>
                <li>PayPal: {commerceFlags.paypalEnabled ? "ON" : "OFF"}</li>
              </ul>
            </>
          )}
          {commerceHealth && (
            <>
              <h3>Orders by Type</h3>
              <pre className="cc-search-results">{JSON.stringify(commerceOrders, null, 2)}</pre>
            </>
          )}
          <h3>Go-Live</h3>
          <div className="cc-actions">
            <button
              type="button"
              className="shop-btn-secondary"
              onClick={() => requestGoLive("Control Center request").then(reload)}
            >
              Request Go-Live
            </button>
            {goLiveRequests[0]?.status === "PENDING" && (
              <button
                type="button"
                className="shop-btn-primary"
                onClick={() => approveGoLive(goLiveRequests[0].id).then(reload)}
              >
                Approve (does not enable sales)
              </button>
            )}
          </div>
          {goLiveRequests.length > 0 && (
            <ul className="cc-status-list">
              {goLiveRequests.map((r) => (
                <li key={r.id}>
                  <strong>{r.status}</strong> — {r.id.slice(0, 16)}…
                  <span className="cc-muted"> {new Date(r.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
          <h3>Readiness Checks</h3>
          {commerceReadiness?.checks && (
            <ul className="cc-status-list">
              {commerceReadiness.checks.map((c) => (
                <li key={c.name}>
                  <span className={c.status === "PASS" ? "cc-status-online" : c.status === "FAIL" ? "cc-status-offline" : "cc-status-warning"}>
                    {c.status}
                  </span>
                  <strong>{c.name}</strong>
                  <span>{c.detail}</span>
                </li>
              ))}
            </ul>
          )}
          <h3>Recent Commerce Security Events</h3>
          {commerceEvents.length === 0 && <p className="admin-note">No commerce security events yet.</p>}
          <ul className="cc-status-list">
            {commerceEvents.slice(0, 15).map((ev, i) => (
              <li key={`${ev.type}-${i}`}>
                <strong>{ev.type}</strong>
                <span className="cc-muted"> {ev.severity} — {new Date(ev.timestamp).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="admin-note">
        <Link href="/admin/security-dashboard/">Security Center</Link>
        {" · "}
        <Link href="/admin/">Dashboard</Link>
      </p>
    </div>
  );
}
