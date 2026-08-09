"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl, isApiConfigured } from "@/lib/api/config";

const BLUEPRINT_URL =
  "https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard";
const API_HEALTH_URL = "https://buzzard-api.onrender.com/api/health";

type ApiState = "checking" | "live" | "unconfigured" | "down";

export default function AdminApiStatusBanner() {
  const [state, setState] = useState<ApiState>("checking");
  const [moduleCount, setModuleCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isApiConfigured()) {
      setState("unconfigured");
      return;
    }

    const base = apiBaseUrl();
    fetch(`${base}/api/health`, { headers: { Accept: "application/json" } })
      .then(async (res) => {
        if (!res.ok) {
          setState("down");
          return;
        }
        const data = (await res.json()) as Record<string, unknown>;
        const enabled = Object.entries(data).filter(
          ([key, value]) =>
            key !== "integrations" &&
            key !== "data" &&
            key !== "automation" &&
            key !== "observability" &&
            typeof value === "object" &&
            value !== null &&
            (value as { enabled?: boolean }).enabled === true
        );
        setModuleCount(enabled.length);
        setState("live");
      })
      .catch(() => setState("down"));
  }, []);

  if (state === "checking" || state === "live") return null;

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
        Admin-Module (v3.1 Supplier Hub, v3.2 OMS, v4.0 Master Admin, …) brauchen die Node-API auf
        Render. GitHub Pages ist live — die API muss einmalig verbunden werden.
      </p>
      <p>
        <a href={BLUEPRINT_URL} target="_blank" rel="noopener noreferrer">
          Render Blueprint deployen
        </a>
        {" · "}
        Health: <code>{API_HEALTH_URL}</code>
      </p>
      {moduleCount === null && (
        <p>
          <small>Nach dem Blueprint-Deploy: Admin neu laden — KPIs und Demo-Daten erscheinen automatisch.</small>
        </p>
      )}
    </div>
  );
}
