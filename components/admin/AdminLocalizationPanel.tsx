"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchAdminLocalizationStatus,
  fetchLocales,
  googleMerchantFeedUrl,
  savePriceOverride,
  saveProductTranslation,
  saveShippingRate,
} from "@/lib/localizationFeeds/client";
import type { LocalizationFeedsStatus, LocalizationLocale } from "@/lib/localizationFeeds/types";

export default function AdminLocalizationPanel() {
  const [status, setStatus] = useState<LocalizationFeedsStatus | null>(null);
  const [locales, setLocales] = useState<LocalizationLocale[]>([]);
  const [selectedLocale, setSelectedLocale] = useState("de-DE");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState("1");
  const [translationName, setTranslationName] = useState("");
  const [translationDescription, setTranslationDescription] = useState("");
  const [priceValue, setPriceValue] = useState("");
  const [shippingCountry, setShippingCountry] = useState("DE");
  const [shippingPrice, setShippingPrice] = useState("4.99");

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, localeRows] = await Promise.all([
      fetchAdminLocalizationStatus(),
      fetchLocales(),
    ]);
    setStatus(statusRow);
    setLocales(localeRows);
    if (!selectedLocale && localeRows[0]) setSelectedLocale(localeRows[0].code);
  }, [selectedLocale]);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "localizationFeeds.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  async function handleSaveTranslation(e: FormEvent) {
    e.preventDefault();
    if (!productId || !translationName.trim()) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await saveProductTranslation(Number(productId), {
        locale: selectedLocale,
        name: translationName.trim(),
        description: translationDescription,
      });
      setMessage("Übersetzung gespeichert");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "localizationFeeds.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePrice(e: FormEvent) {
    e.preventDefault();
    if (!productId || !priceValue) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await savePriceOverride(Number(productId), {
        locale: selectedLocale,
        price: Number(priceValue),
      });
      setMessage("Preis-Override gespeichert");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "localizationFeeds.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveShipping(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await saveShippingRate({
        countryCode: shippingCountry,
        price: Number(shippingPrice),
        freeFrom: 49,
      });
      setMessage("Versandtarif gespeichert");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "localizationFeeds.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Localization wird geladen…</p>;

  const selected = locales.find((row) => row.code === selectedLocale);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Localization & Merchant Feeds</h1>
        {status?.version && <span className="admin-note">API v{status.version}</span>}
      </div>

      <p className="admin-note">
        Produktübersetzungen, länderspezifische Preise, Steuer-/Versandtabellen und Google-Merchant-Feeds für
        Europa und Balkan-Märkte.
      </p>

      {error && <p className="shop-modal-error">{error}</p>}
      {message && <p className="admin-message">{message}</p>}

      {status && (
        <div className="admin-stat-grid">
          <article className="admin-stat">
            <strong>{status.locales?.length ?? status.localeCount ?? 0}</strong>
            <span>Locales</span>
          </article>
          <article className="admin-stat">
            <strong>{status.totals.translations}</strong>
            <span>Übersetzungen</span>
          </article>
          <article className="admin-stat">
            <strong>{status.totals.priceOverrides}</strong>
            <span>Preis-Overrides</span>
          </article>
          <article className="admin-stat">
            <strong>{status.totals.shippingRates ?? 0}</strong>
            <span>Versandtarife</span>
          </article>
        </div>
      )}

      <section className="admin-panel">
        <h2>Locale wählen</h2>
        <select value={selectedLocale} onChange={(e) => setSelectedLocale(e.target.value)}>
          {locales.map((locale) => (
            <option key={locale.code} value={locale.code}>
              {locale.name} · {locale.currency} · {locale.country_code}
            </option>
          ))}
        </select>
        {selected && (
          <p className="admin-note">
            Ausgewählt: {selected.code} ({selected.currency}, {selected.country_code})
          </p>
        )}
      </section>

      <section className="admin-panel">
        <h2>Produktübersetzung</h2>
        <form className="admin-form-grid" onSubmit={handleSaveTranslation}>
          <label>
            Produkt-ID
            <input value={productId} onChange={(e) => setProductId(e.target.value)} />
          </label>
          <label>
            Name ({selectedLocale})
            <input value={translationName} onChange={(e) => setTranslationName(e.target.value)} required />
          </label>
          <label className="admin-form-span">
            Beschreibung
            <textarea
              value={translationDescription}
              onChange={(e) => setTranslationDescription(e.target.value)}
            />
          </label>
          <div className="admin-form-actions">
            <button type="submit" className="shop-btn-primary" disabled={busy}>
              Übersetzung speichern
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <h2>Preis-Override</h2>
        <form className="automation-queue-form" onSubmit={handleSavePrice}>
          <input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="Produkt-ID" />
          <input
            type="number"
            step="0.01"
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            placeholder={`Preis ${selected?.currency || "EUR"}`}
          />
          <button type="submit" className="shop-btn-secondary" disabled={busy}>
            Preis speichern
          </button>
        </form>
      </section>

      <section className="admin-panel">
        <h2>Versandtarif</h2>
        <form className="automation-queue-form" onSubmit={handleSaveShipping}>
          <input
            value={shippingCountry}
            onChange={(e) => setShippingCountry(e.target.value.toUpperCase())}
            maxLength={2}
            placeholder="Land"
          />
          <input
            type="number"
            step="0.01"
            value={shippingPrice}
            onChange={(e) => setShippingPrice(e.target.value)}
            placeholder="Preis"
          />
          <button type="submit" className="shop-btn-secondary" disabled={busy}>
            Versand speichern
          </button>
        </form>
      </section>

      <section className="admin-panel">
        <h2>Google Merchant Feed</h2>
        <p className="admin-note">Land- und sprachspezifischer RSS-Feed für Merchant Center.</p>
        <code>{googleMerchantFeedUrl({ locale: selectedLocale, country: selected?.country_code, currency: selected?.currency })}</code>
      </section>

      {status?.taxRates && status.taxRates.length > 0 && (
        <section className="admin-panel">
          <h2>Steuersätze</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Land</th>
                  <th>Satz</th>
                </tr>
              </thead>
              <tbody>
                {status.taxRates.map((row) => (
                  <tr key={row.country_code}>
                    <td>{row.country_code}</td>
                    <td>{Math.round(row.rate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
