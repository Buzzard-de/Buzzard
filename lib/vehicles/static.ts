export const vehicleBrands: Record<string, string[]> = {
  Audi: ["A3", "A4", "A6", "Q5", "Q7"],
  BMW: ["1er", "3er", "5er", "X3", "X5"],
  Mercedes: ["A-Klasse", "C-Klasse", "E-Klasse", "GLC", "GLE"],
  Volkswagen: ["Golf", "Passat", "Tiguan", "Polo", "T-Roc"],
  Opel: ["Corsa", "Astra", "Insignia", "Mokka"],
  Ford: ["Focus", "Fiesta", "Kuga", "Mondeo"],
};

import { buildVehicleSearchYears } from "./yearRange";

/** Selectable search years from 1960 through next model year. Not catalog coverage. */
export const vehicleYears = buildVehicleSearchYears();
export const vehicleEngines = ["1.0 Benzin", "1.5 Benzin", "2.0 Diesel", "2.0 Benzin", "3.0 Diesel"];
