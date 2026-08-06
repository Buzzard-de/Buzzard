import type { SavedVehicle } from "@/types";
import { vehicleBrands, vehicleEngines, vehicleYears } from "@/lib/vehicles";
import { isSafeName } from "@/lib/security";

export function isValidSavedVehicle(value: unknown): value is SavedVehicle {
  if (!value || typeof value !== "object") return false;

  const v = value as Partial<SavedVehicle>;
  if (typeof v.brand !== "string" || typeof v.model !== "string") return false;
  if (typeof v.year !== "string" || typeof v.engine !== "string") return false;

  const models = vehicleBrands[v.brand];
  if (!models || !models.includes(v.model)) return false;
  if (!vehicleYears.includes(v.year)) return false;
  if (v.engine && !vehicleEngines.includes(v.engine)) return false;

  return isSafeName(`${v.brand} ${v.model}`);
}

export function sanitizeSavedVehicle(vehicle: SavedVehicle): SavedVehicle | null {
  return isValidSavedVehicle(vehicle) ? vehicle : null;
}
