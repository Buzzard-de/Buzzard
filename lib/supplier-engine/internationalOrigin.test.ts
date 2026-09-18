import { describe, it, expect } from "vitest";
import {
  buildSupplierInternationalProfile,
  resolveSupplierOriginCountry,
} from "./internationalOrigin";

describe("Supplier International Origin", () => {
  it("prefers shippingOrigins over warehouseCountries", () => {
    const profile = buildSupplierInternationalProfile({
      supplierId: "S1",
      country: "DE",
      shippingOrigins: ["PL"],
      warehouseCountries: ["DE"],
      capabilities: {},
    });
    const resolved = resolveSupplierOriginCountry(profile);
    expect(resolved.originCountry).toBe("PL");
    expect(resolved.source).toBe("shippingOrigins");
  });

  it("does not assume EU for unknown country", () => {
    const profile = buildSupplierInternationalProfile({
      supplierId: "S2",
      country: "INVALID",
      capabilities: {},
    });
    expect(profile.supplierCountry).toBeUndefined();
    expect(profile.euMemberState).toBeUndefined();
    expect(resolveSupplierOriginCountry(profile).originCountry).toBeUndefined();
  });

  it("derives euMemberState from supplierCountry", () => {
    const de = buildSupplierInternationalProfile({
      supplierId: "S3",
      country: "DE",
      supplierCountry: "DE",
      capabilities: {},
    });
    const tr = buildSupplierInternationalProfile({
      supplierId: "S4",
      country: "TR",
      supplierCountry: "TR",
      capabilities: {},
    });
    expect(de.euMemberState).toBe(true);
    expect(tr.euMemberState).toBe(false);
  });
});
