"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAdminAuth } from "@/lib/admin/context";
import { isProductionBuild } from "@/lib/api/config";

export default function AdminLoginForm() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("admin@buzzard.de");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/admin/");
    } catch (err) {
      if (err instanceof Error && err.message === "admin.apiUnavailable") {
        setError("Admin-Service derzeit nicht erreichbar. Bitte später erneut versuchen.");
      } else {
        setError("Anmeldung fehlgeschlagen. E-Mail oder Passwort ungültig.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <h1>Buzzard Admin</h1>
        <p>Lieferanten- & Katalogverwaltung</p>
        <label htmlFor="email">E-Mail</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="password">Passwort</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="shop-modal-error">{error}</p>}
        <button type="submit" className="shop-btn-primary" disabled={loading}>
          {loading ? "Anmelden…" : "Anmelden"}
        </button>
        {!isProductionBuild() ? (
          <p className="admin-login-hint">Demo: admin@buzzard.de / BuzzardAdmin2026!</p>
        ) : null}
      </form>
    </div>
  );
}
