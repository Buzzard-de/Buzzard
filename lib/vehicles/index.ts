export { vehicleBrands, vehicleEngines, vehicleYears } from "./static";
export {
  MIN_VEHICLE_SEARCH_YEAR,
  maxVehicleSearchYear,
  buildVehicleSearchYears,
  isAcceptedVehicleSearchYear,
} from "./yearRange";
export {
  buildVehicleCatalogFromApi,
  enginesForVehicleSelection,
  getActiveVehicleCatalog,
  getStaticVehicleCatalog,
  loadVehicleCatalog,
  resolveVehicleId,
  setActiveVehicleCatalog,
  yearsForVehicleSelection,
  type VehicleCatalog,
} from "./catalog";
