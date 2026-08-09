import type { SavedVehicle } from "@/types";
import { getActiveVehicleCatalog } from "@/lib/vehicles/catalog";
import { isSafeName } from "@/lib/security";

export function isValidSavedVehicle(value: unknown): value is SavedVehicle {
  if (!value || typeof value !== "object") return false;

  const v = value as Partial<SavedVehicle>;
  if (typeof v.brand !== "string" || typeof v.model !== "string") return false;
  if (typeof v.year !== "string" || typeof v.engine !== "string") return false;

  const catalog = getActiveVehicleCatalog();
  const models = catalog.brands[v.brand];
  if (!models || !models.includes(v.model)) return false;

  const allowedYears = catalog.fromApi
    ? catalog.apiRows
        .filter((row) => row.make === v.brand && row.model === v.model)
        .flatMap((row) => {
          const years: string[] = [];
          for (let y = row.year_to; y >= row.year_from; y -= 1) years.push(String(y));
          return years;
        })
    : catalog.years;

  if (!allowedYears.includes(v.year)) return false;

  const allowedEngines = catalog.fromApi
    ? [
        ...new Set(
          catalog.apiRows
            .filter((row) => row.make === v.brand && row.model === v.model)
            .map((row) => row.engine)
            .filter(Boolean)
        ),
      ]
    : catalog.engines;

  if (v.engine && allowedEngines.length && !allowedEngines.includes(v.engine)) return false;

  return isSafeName(`${v.brand} ${v.model}`);
}

export function sanitizeSavedVehicle(vehicle: SavedVehicle): SavedVehicle | null {
  return isValidSavedVehicle(vehicle) ? vehicle : null;
}
