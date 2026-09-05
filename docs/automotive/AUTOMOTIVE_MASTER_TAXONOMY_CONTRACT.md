# Buzzard — Automotive & Motor Vehicles Master Taxonomy

## Objective

Build a complete scalable automotive and motor-vehicle product taxonomy for Buzzard.

The taxonomy must support:

```
Automotive & Motor Vehicles
    ↓
Main Category
    ↓
Subcategory
    ↓
Sub-subcategory
    ↓
Product Type
    ↓
Vehicle Compatibility
    ↓
Product Attributes
```

## Required Vehicle Groups

The taxonomy must support at minimum:

1. Passenger Cars
2. SUVs
3. Vans
4. Light Commercial Vehicles
5. Trucks
6. Buses
7. Trailers
8. Semi-Trailers
9. Caravans / Motorhomes
10. Motorcycles
11. Scooters
12. Mopeds
13. ATV / Quad
14. Agricultural Tractors
15. Agricultural Machinery
16. Construction Machinery
17. Industrial / Utility Vehicles
18. Off-Road Vehicles
19. Racing Vehicles
20. Electric Vehicles
21. Hybrid Vehicles

## Core Principle

Taxonomy must be based on what a vehicle needs. Do not create a flat category list.

Every category must support:

- category
- subcategory
- sub-subcategory
- product type
- vehicle type
- make
- model
- generation
- production year
- engine
- fuel type
- power
- axle / drivetrain where applicable
- OEM / OE reference
- EAN / GTIN
- SKU
- manufacturer
- compatibility
- technical attributes

## Automotive Product Areas

The implementation must provide a scalable structure for at least these major areas:

1. Tires
2. Wheels & Rims
3. Brakes
4. Engine & Engine Parts
5. Engine Oils & Fluids
6. Filters
7. Batteries & Electrical
8. Exhaust & Emissions
9. Cooling System
10. Transmission & Drivetrain
11. Clutch
12. Suspension
13. Steering
14. Fuel System
15. Ignition
16. Air Intake
17. Turbocharging
18. Heating & Air Conditioning
19. Vehicle Electronics
20. Lighting
21. Body & Exterior
22. Interior
23. Safety
24. Workshop & Garage
25. Tools
26. Vehicle Care & Cleaning
27. Accessories
28. Trailer & Towing
29. Commercial Vehicle Parts
30. Motorcycle Parts
31. Agricultural Vehicle Parts
32. Construction / Machinery Parts
33. EV & Hybrid Components
34. Motorsport / Racing
35. Off-Road Equipment

## Tire Requirement

Tires must be a dedicated category. At minimum support:

- Passenger car
- Light commercial
- Truck
- Bus
- Motorcycle
- Scooter
- ATV / Quad
- Tractor
- Agricultural machinery
- Construction machinery
- Trailer
- Semi-trailer
- Caravan / motorhome
- Off-road
- Racing
- EV
- Hybrid

Tire attributes must include where applicable:

- width
- aspect ratio
- rim diameter
- load index
- speed rating
- season
- run-flat
- XL / reinforced
- commercial rating
- tube / tubeless
- axle position
- vehicle compatibility

## Compatibility

Compatibility must never be hardcoded into individual UI pages. Create a reusable compatibility engine.

Compatibility hierarchy:

```
Vehicle Type
    ↓
Manufacturer
    ↓
Model
    ↓
Generation
    ↓
Year
    ↓
Engine
    ↓
Fuel
    ↓
Power
    ↓
Specific product compatibility
```

The architecture must allow TecDoc integration later.

## No Live Supplier Activation

This project must NOT:

- connect a real supplier
- call a live supplier API
- import live products
- publish products
- activate sales
- activate Stripe
- activate PayPal
- enable checkout
- enable automatic activation
- introduce credentials
- introduce secrets

Only taxonomy, catalog infrastructure, compatibility and dry-run functionality are allowed.

## Product State

Products created by this system must support:

- DRAFT
- REVIEW
- APPROVED
- PUBLISHED

But the implementation must NOT automatically move products to PUBLISHED.

## Safety

Fail closed. No automatic go-live. No automatic publishing. Human approval remains mandatory.

## Related Code

| Module | Path |
|--------|------|
| Master taxonomy | `server/core/automotiveTaxonomy.js` |
| Compatibility engine | `server/lib/automotive/vehicleCompatibility.js` |
| Validators | `server/lib/catalog/automotiveTaxonomyValidator.js` |
| Existing KFZ tree (legacy) | `data/taxonomy/buzzard_master_kfz_category_tree_v1.json` |
| Fitment prep (PIM) | `server/lib/pim/fitmentSchema.js` |
