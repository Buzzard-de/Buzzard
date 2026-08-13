"use client";

import { useEffect, useState } from "react";
import { fetchApiHealth, type ApiHealthState } from "@/lib/api/health";
import { apiBaseUrl } from "@/lib/api/config";

const BLUEPRINT_URL =
  "https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard";
const RENDER_GITHUB_APP = "https://github.com/apps/render";

export default function AdminApiStatusBanner() {
  const [state, setState] = useState<ApiHealthState>("checking");
  const [moduleCount, setModuleCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const snapshot = await fetchApiHealth();
      if (cancelled) return;
      setState(snapshot.state);
      setModuleCount(snapshot.moduleCount);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") return null;

  if (state === "live") {
    return (
      <div className="admin-api-banner admin-api-banner--live" role="status">
        <strong>API live</strong>
        <p>
          Buzzard API erreichbar
          {moduleCount != null ? ` · ${moduleCount} Module aktiv` : ""}.
        </p>
      </div>
    );
  }

  if (state === "unconfigured") {
    return (
      <div className="admin-api-banner" role="status">
        <strong>API-URL nicht konfiguriert</strong>
        <p>
          Setze <code>NEXT_PUBLIC_BUZZARD_API_URL</code> auf{" "}
          <code>https://buzzard-api.onrender.com</code> (GitHub Pages Variable{" "}
          <code>BUZZARD_API_URL</code>).
        </p>
      </div>
    );
  }

  return (
    <div className="admin-api-banner" role="status">
      <strong>Buzzard API offline</strong>
      <p>
        Admin-Module brauchen die Node-API auf Render. GitHub Pages ist live — die API muss einmalig
        verbunden werden.
      </p>
      <p>
        <a href={RENDER_GITHUB_APP} target="_blank" rel="noopener noreferrer">
          Render GitHub App
        </a>
        {" · "}
        <a href={BLUEPRINT_URL} target="_blank" rel="noopener noreferrer">
          Blueprint deployen
        </a>
        {" · "}
        Health: <code>{apiBaseUrl() || "https://buzzard-api.onrender.com"}/api/health</code>
      </p>
    </div>
  );
}
