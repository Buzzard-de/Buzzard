"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl } from "@/lib/api/config";

const BLUEPRINT_URL =
  "https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard";

type ApiState = "checking" | "live" | "down";

export default function AdminApiStatusBanner() {
  const [state, setState] = useState<ApiState>("checking");

  useEffect(() => {
    const base = apiBaseUrl();
    if (!base) {
      setState("down");
      return;
    }

    fetch(`${base}/api/health`, { headers: { Accept: "application/json" } })
      .then((res) => setState(res.ok ? "live" : "down"))
      .catch(() => setState("down"));
  }, []);

  if (state === "checking" || state === "live") return null;

  return (
    <div className="admin-api-banner" role="status">
      <strong>Buzzard API offline</strong>
      <p>
        Admin-Module (OMS, Cart, Finance, PIM, …) brauchen die Node-API auf Render. GitHub Pages ist
        live — die API muss einmalig verbunden werden.
      </p>
      <p>
        <a href={BLUEPRINT_URL} target="_blank" rel="noopener noreferrer">
          Render Blueprint deployen
        </a>
        {" · "}
        Health: <code>{apiBaseUrl() || "—"}/api/health</code>
      </p>
    </div>
  );
}
