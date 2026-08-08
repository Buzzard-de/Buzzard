const productStore = require("./productStore");

function toPublicProduct(product) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    categoryId: product.category_id,
    categoryIds: product.category_ids || [product.category_id],
    price: product.price?.amount,
    stockStatus: product.stock_status || (product.stock > 0 ? "in_stock" : "out_of_stock"),
    url: `/produkt/${(product.seo?.slug || product.id).replace(/^\/+|\/+$/g, "")}/`,
    imageKey: product.attributes?.image_key,
  };
}

function getRelated(productId, limit = 4) {
  const product = productStore.getProductById(productId);
  if (!product || product.status !== "active") return [];
  const products = productStore.listProducts({ status: "active" });
  return products
    .filter((p) => p.id !== product.id && p.category_id === product.category_id)
    .slice(0, limit)
    .map(toPublicProduct);
}

function getFrequentlyBoughtTogether(productId, limit = 3) {
  const product = productStore.getProductById(productId);
  if (!product || product.status !== "active") return [];
  const categoryIds = new Set(product.category_ids || [product.category_id]);
  return productStore
    .listProducts({ status: "active" })
    .filter(
      (p) =>
        p.id !== product.id &&
        (p.category_ids || [p.category_id]).some((id) => categoryIds.has(id))
    )
    .slice(0, limit)
    .map(toPublicProduct);
}

function searchForRecommendations(query, limit = 6) {
  if (!query?.trim()) return [];
  return productStore
    .listProducts({ status: "active", q: query.trim() })
    .slice(0, limit)
    .map(toPublicProduct);
}

function getRecommendations(options = {}) {
  const { productId, query, categoryId, limit = 6, viewedIds = [] } = options;
  let items = [];

  if (productId) {
    items = [...getRelated(productId, limit), ...getFrequentlyBoughtTogether(productId, limit)];
  } else if (query) {
    items = searchForRecommendations(query, limit);
  } else if (categoryId) {
    items = productStore
      .listProducts({ status: "active" })
      .filter((p) => p.category_id === categoryId || (p.category_ids || []).includes(categoryId))
      .slice(0, limit)
      .map(toPublicProduct);
  }

  const seen = new Set(viewedIds);
  const deduped = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

module.exports = {
  getRecommendations,
  getRelated,
  getFrequentlyBoughtTogether,
  searchForRecommendations,
};
