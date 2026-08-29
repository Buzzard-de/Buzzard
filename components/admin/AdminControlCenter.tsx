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
import type {
  ActivityEvent,
  AiEmployee,
  AiTask,
  Approval,
  ControlCenterStatus,
  DashboardSummary,
  Integration,
} from "@/lib/admin/controlCenterTypes";
import { getMainCategories } from "@/lib/categories";

type Tab = "overview" | "ai" | "tasks" | "approvals" | "categories" | "integrations" | "activity";

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

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, sum, emps, tsk, appr, integ, act, vis] = await Promise.all([
        fetchControlCenterStatus(),
        fetchDashboardSummary(),
        fetchAiEmployees(),
        fetchAiTasks(),
        fetchApprovals("PENDING"),
        fetchIntegrations(true),
        fetchActivity(25),
        fetchCategoryVisibility(),
      ]);
      setStatus(st);
      setSummary(sum);
      setEmployees(emps);
      setTasks(tsk);
      setApprovals(appr);
      setIntegrations(integ);
      setActivity(act);
      setVisibility(vis);
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

      <p className="admin-note">
        <Link href="/admin/security-dashboard/">Security Center</Link>
        {" · "}
        <Link href="/admin/">Dashboard</Link>
      </p>
    </div>
  );
}
