import type { ProductEngineProduct } from "@/lib/product-engine/types";
import { getProduct } from "@/lib/product-engine/service";
import { getTranslationForLocale } from "@/lib/product-engine/translations";
import type { ProductAiInput } from "./types";
import type { WorkerContext } from "../types";

export function buildProductAiInputFromEngine(
  product: ProductEngineProduct,
  context: WorkerContext
): ProductAiInput {
  const language = context.language ?? "de";
  const translation = getTranslationForLocale(product.translations, language);
  const primaryOffer = product.supplierOffers[0];

  return {
    productId: product.productId,
    supplierId: primaryOffer?.supplierId ?? context.supplierId,
    sourceOfferId: primaryOffer?.supplierSku,
    market: context.market,
    channel: context.channel,
    language,
    title: translation?.name,
    description: translation?.description ?? translation?.shortDescription,
    brand: product.brand,
    manufacturer: product.manufacturer,
    mpn: product.mpn,
    ean: product.ean,
    gtin: product.gtin,
    category: product.categoryId,
    subcategory: product.subcategoryId,
    attributes: { ...product.technicalData },
    imagesMetadata: product.images.map((img) => ({
      url: img.url,
      type: img.type,
      alt: img.alt,
    })),
    dimensions: product.dimensions,
    weight: product.weight,
    weightUnit: product.weightUnit,
    compatibility: product.compatibility.map((c) => ({ ...c })),
    countryOfOrigin: product.technicalData.countryOfOrigin as string | undefined,
    existingTranslations: product.translations.map((t) => ({
      locale: t.locale,
      title: t.name,
      description: t.description ?? t.shortDescription,
    })),
    marketAvailability: product.availability.map((a) => a.countryCode),
    stockStatus: product.stock.availability,
    productType: product.productType,
  };
}

export function buildProductAiInput(context: WorkerContext): ProductAiInput | null {
  const productId = context.productId;
  if (!productId) return null;

  const product = getProduct(productId);
  if (!product) {
    const override = context.metadata?.productAiInput as ProductAiInput | undefined;
    if (override) return { ...override, productId };
    return null;
  }

  let input = buildProductAiInputFromEngine(product, context);

  const scenario = context.metadata?.fixtureScenario as string | undefined;
  if (scenario) {
    input = applyFixtureScenarioOverrides(input, scenario, context);
  }

  return input;
}

function applyFixtureScenarioOverrides(
  input: ProductAiInput,
  scenario: string,
  context: WorkerContext
): ProductAiInput {
  switch (scenario) {
    case "missing-title-description":
      return { ...input, title: undefined, description: undefined };
    case "missing-attributes":
      return { ...input, attributes: {} };
    case "category-ambiguity":
      return { ...input, category: undefined, title: "Universal Part 12345" };
    case "duplicate-ean":
      return { ...input, ean: "4006633001234", productId: "duplicate-test-product" };
    case "conflicting-supplier-data":
      return {
        ...input,
        weight: -5,
        dimensions: { length: 100, width: 50, height: 200, unit: "mm" },
        attributes: { ...input.attributes, width: 225, rimDiameter: 17, conflictingWidth: 205 },
      };
    case "missing-automotive-compatibility":
      return { ...input, compatibility: [], productType: "automotive" };
    case "unsupported-technical-claim":
      return {
        ...input,
        description: `${input.description ?? ""} Guaranteed 500HP increase and universal fit for all vehicles.`,
      };
    case "compliance-incomplete":
      return {
        ...input,
        countryOfOrigin: undefined,
        manufacturer: undefined,
        attributes: { ...input.attributes, countryOfOrigin: null },
      };
    case "customer-service-restricted":
      return {
        ...input,
        _internal: {
          qualityScore: 42,
          duplicateInternals: true,
          supplierCost: 50,
        },
      };
    default:
      return input;
  }
}

export function resolveProductForAnalysis(context: WorkerContext): ProductEngineProduct | undefined {
  const productId = context.productId;
  if (!productId) return undefined;
  return getProduct(productId);
}
