"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  vehicleBrands,
  vehicleEngines,
  vehicleYears,
  useShop,
} from "@/lib/shop";
import { normalizeVin } from "@/lib/security";

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="shop-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="shop-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="shop-modal-header">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="shop-modal-close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function VehicleModal() {
  const { setVehicle, closeModal, vehicle } = useShop();
  const router = useRouter();
  const [brand, setBrand] = useState(vehicle?.brand || "");
  const [model, setModel] = useState(vehicle?.model || "");
  const [year, setYear] = useState(vehicle?.year || "");
  const [engine, setEngine] = useState(vehicle?.engine || "");

  const models = brand ? vehicleBrands[brand] || [] : [];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!brand || !model || !year) return;
    setVehicle({ brand, model, year, engine: engine || vehicleEngines[0] });
    router.push("/products/");
  }

  return (
    <ModalShell title="Fahrzeug auswählen" onClose={closeModal}>
      <form className="shop-modal-form" onSubmit={handleSubmit}>
        <label htmlFor="brand">Marke</label>
        <select id="brand" value={brand} onChange={(e) => { setBrand(e.target.value); setModel(""); }} required>
          <option value="">Marke wählen</option>
          {Object.keys(vehicleBrands).map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <label htmlFor="model">Modell</label>
        <select id="model" value={model} onChange={(e) => setModel(e.target.value)} required disabled={!brand}>
          <option value="">Modell wählen</option>
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <label htmlFor="year">Baujahr</label>
        <select id="year" value={year} onChange={(e) => setYear(e.target.value)} required>
          <option value="">Jahr wählen</option>
          {vehicleYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <label htmlFor="engine">Motorisierung</label>
        <select id="engine" value={engine} onChange={(e) => setEngine(e.target.value)}>
          <option value="">Motor wählen</option>
          {vehicleEngines.map((en) => (
            <option key={en} value={en}>{en}</option>
          ))}
        </select>

        <button type="submit" className="shop-modal-submit">Teile anzeigen</button>
      </form>
    </ModalShell>
  );
}

function VinModal() {
  const { setVin, closeModal } = useShop();
  const router = useRouter();
  const [vin, setVinInput] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleaned = normalizeVin(vin);
    if (!cleaned) {
      setError("Die VIN muss genau 17 gültige Zeichen haben (ohne I, O, Q).");
      return;
    }
    setVin(cleaned);
    router.push(`/products/?vin=${encodeURIComponent(cleaned)}`);
  }

  return (
    <ModalShell title="VIN / Fahrgestellnummer" onClose={closeModal}>
      <form className="shop-modal-form" onSubmit={handleSubmit}>
        <p className="shop-modal-hint">
          Geben Sie die 17-stellige Fahrgestellnummer ein, um passende Teile zu finden.
        </p>
        <label htmlFor="vin">VIN</label>
        <input
          id="vin"
          value={vin}
          onChange={(e) => { setVinInput(e.target.value.toUpperCase()); setError(""); }}
          placeholder="WVWZZZ1KZAW123456"
          maxLength={17}
          required
        />
        {error && <p className="shop-modal-error">{error}</p>}
        <button type="submit" className="shop-modal-submit">Mit VIN suchen</button>
      </form>
    </ModalShell>
  );
}

export default function ShopModals() {
  const { modal } = useShop();
  if (modal === "vehicle") return <VehicleModal />;
  if (modal === "vin") return <VinModal />;
  return null;
}
