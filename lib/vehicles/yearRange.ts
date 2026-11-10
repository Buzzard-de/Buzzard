/** Search-year acceptance only. Does not imply catalog coverage or fitment. */
export const MIN_VEHICLE_SEARCH_YEAR = 1960;

export function maxVehicleSearchYear(now: Date = new Date()): number {
  return now.getUTCFullYear() + 1;
}

export function buildVehicleSearchYears(
  min: number = MIN_VEHICLE_SEARCH_YEAR,
  max: number = maxVehicleSearchYear()
): string[] {
  const years: string[] = [];
  for (let year = max; year >= min; year -= 1) {
    years.push(String(year));
  }
  return years;
}

export function isAcceptedVehicleSearchYear(value: string | number | null | undefined, now: Date = new Date()): boolean {
  if (value == null || value === "") return false;
  const raw = String(value).trim();
  if (!/^-?\d+$/.test(raw)) return false;
  const year = Number(raw);
  return Number.isInteger(year) && year >= MIN_VEHICLE_SEARCH_YEAR && year <= maxVehicleSearchYear(now);
}
