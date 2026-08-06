"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SavedVehicle, ShopModal } from "@/types";
import { isValidVin, normalizeVin } from "@/lib/security";
import { isValidSavedVehicle, sanitizeSavedVehicle } from "@/lib/validate-vehicle";
import { vehicleBrands, vehicleEngines, vehicleYears } from "@/lib/vehicles";

export { vehicleBrands, vehicleEngines, vehicleYears };

const VEHICLE_KEY = "buzzard_vehicle";
const VIN_KEY = "buzzard_vin";

export function getSavedVehicle(): SavedVehicle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(VEHICLE_KEY) || "null");
    return isValidSavedVehicle(raw) ? raw : null;
  } catch {
    localStorage.removeItem(VEHICLE_KEY);
    return null;
  }
}

export function saveVehicle(vehicle: SavedVehicle) {
  const safe = sanitizeSavedVehicle(vehicle);
  if (!safe) return;
  localStorage.setItem(VEHICLE_KEY, JSON.stringify(safe));
}

export function getSavedVin(): string | null {
  if (typeof window === "undefined") return null;
  const vin = localStorage.getItem(VIN_KEY);
  return vin && isValidVin(vin) ? vin : null;
}

export function saveVin(vin: string) {
  const normalized = normalizeVin(vin);
  if (!normalized) return;
  localStorage.setItem(VIN_KEY, normalized);
}

interface ShopContextValue {
  modal: ShopModal;
  vehicle: SavedVehicle | null;
  vin: string | null;
  openVehicleModal: () => void;
  openVinModal: () => void;
  closeModal: () => void;
  setVehicle: (vehicle: SavedVehicle) => void;
  setVin: (vin: string) => void;
  clearVehicle: () => void;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ShopModal>(null);
  const [vehicle, setVehicleState] = useState<SavedVehicle | null>(null);
  const [vin, setVinState] = useState<string | null>(null);

  useEffect(() => {
    setVehicleState(getSavedVehicle());
    setVinState(getSavedVin());
  }, []);

  const setVehicle = useCallback((v: SavedVehicle) => {
    saveVehicle(v);
    setVehicleState(v);
    setModal(null);
  }, []);

  const setVin = useCallback((v: string) => {
    const normalized = normalizeVin(v);
    if (!normalized) return;
    saveVin(normalized);
    setVinState(normalized);
    setModal(null);
  }, []);

  const clearVehicle = useCallback(() => {
    localStorage.removeItem(VEHICLE_KEY);
    localStorage.removeItem(VIN_KEY);
    setVehicleState(null);
    setVinState(null);
  }, []);

  const value = useMemo(
    () => ({
      modal,
      vehicle,
      vin,
      openVehicleModal: () => setModal("vehicle"),
      openVinModal: () => setModal("vin"),
      closeModal: () => setModal(null),
      setVehicle,
      setVin,
      clearVehicle,
    }),
    [modal, vehicle, vin, setVehicle, setVin, clearVehicle]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}
