# Automotive Category Matrix

Generated from `data/automotive/automotive_core_12_categories.json`.

## Summary

| Metric | Count |
|--------|-------|
| Top-level categories | 12 |
| Subcategories | 125 |
| Product types | 500 |

## Category Matrix

### 1. tires_wheels — Reifen & Felgen / Lastik & Jant

Subcategories: Car Tires, SUV/4x4 Tires, Van Tires, Truck Tires, Bus Tires, Tractor Tires, Agricultural Tires, Construction Machine Tires, Motorcycle Tires, Scooter Tires, Trailer Tires, Bicycle Tires, Rims, Steel Rims, Alloy Wheels, Wheel Accessories

Required attributes: width, aspectRatio, rimDiameter, loadIndex, speedRating, season, brand  
Search: tire size (205/55 R16, 315/80 R22.5), season, vehicle, brand  
Fitment: vehicle tire size match  
Identity: EAN, GTIN, MPN, OEM

### 2. brakes — Bremsen / Fren Sistemi

Subcategories: Brake Pads, Brake Discs, Brake Drums, Brake Shoes, Calipers, Brake Lines, Sensors, Brake Kits  
Attributes: brakeType, axle, diameter, thickness, material, wearSensor  
Fitment: required (HIGH confidence minimum)

### 3. oils_fluids — Motoröle & Flüssigkeiten

Subcategories: Engine Oil, Gear Oil, ATF, CVT Fluid, Coolant, Antifreeze, Brake Fluid, Hydraulic Fluid, Washer Fluid, Additives  
Attributes: viscosity, SAE, API, ACEA, OEM approval, volume  
Search: 5W-30, 5W-40, OEM approval codes

### 4. engine_parts — Motor & Motor Teile

Subcategories: Complete Engines, Engine Blocks, Cylinder Heads, Pistons, Rings, Bearings, Crankshafts, Camshafts, Timing Belts, Timing Chains, Water Pumps, Oil Pumps, Turbochargers, Injectors, Gaskets, Seals  
Attributes: engineCode, displacement, cylinders, fuel, OEM, MPN

### 5. spare_parts — Ersatzteile / Yedek Parça

Subcategories: Filters, Steering, Suspension, Exhaust, Cooling, Clutch, Transmission, Driveshaft, Wheel Bearings, Sensors, Body Parts, Lighting  
Cross-reference: OEM/MPN with confidence — never auto-equivalent

### 6. batteries_electrical — Batterie & Elektrik

Subcategories: Starter Batteries, AGM, EFB, Alternators, Starter Motors, Spark Plugs, Glow Plugs, Sensors, Relays, Fuses, Lamps, Electrical Modules  
Attributes: voltage, Ah, CCA, technology, dimensions

### 7. agricultural_vehicles — Traktor & Landwirtschaft

Subcategories: Tractors, Harvesters, Agricultural Machines, Implements, Agricultural Trailers, Agricultural Tires, Agricultural Parts  
Fitment: manufacturer, model, year, engine, PTO, tireSize

### 8. trucks_commercial — LKW & Nutzfahrzeuge

Subcategories: Trucks, Vans, LCV, Semi Trucks, Truck Tires, Truck Brakes, Truck Parts, Commercial Vehicle Parts  
Tire formats: 315/80 R22.5, 385/65 R22.5, 295/80 R22.5

### 9. buses_minibuses — Bus & Minibus

Subcategories: City Buses, Coaches, Minibuses, Bus Tires, Bus Brakes, Bus Parts

### 10. construction_machinery — Baumaschinen

Subcategories: Excavators, Wheel Loaders, Forklifts, Cranes, Bulldozers, Rollers, Telehandlers, Construction Tires, Hydraulic Parts, Construction Parts

### 11. motorcycles_scooters — Motorrad & Roller

Subcategories: Motorcycles, Scooters, Mopeds, ATV, Quad, Electric Motorcycles, Electric Scooters, Motorcycle Tires, Motorcycle Brakes, Motorcycle Parts  
Fitment: engineCC, front/rear tire

### 12. trailers — Anhänger & Trailer

Subcategories: Car Trailers, Truck Trailers, Semi Trailers, Agricultural Trailers, Construction Trailers, Boat Trailers, Utility Trailers, Trailer Tires, Trailer Brakes, Trailer Parts  
Attributes: axles, GVW, payload, coupling, wheelSize, tireSize

## Per-Category Rules (all categories)

| Rule | Value |
|------|-------|
| Uncertain mapping | REVIEW_REQUIRED |
| Missing identifiers | REVIEW_REQUIRED / BLOCKED |
| Missing images | REVIEW_REQUIRED |
| Unknown stock | UNKNOWN (not displayed as available) |
| Publish | manualPublish + human approval + safety gates |
| Sales OFF | no public prices, no merchant offers |

Regenerate: `npm run automotive:generate-core-categories`
