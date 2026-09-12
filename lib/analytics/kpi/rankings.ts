import type {
  CategoryKpiRow,
  CommerceChannelKpiRow,
  MarketKpiRow,
  ProductKpiRow,
  RankingRow,
} from "./types";
import { clampLimit } from "./query";

export function buildRankings(
  products: ProductKpiRow[],
  categories: CategoryKpiRow[],
  markets: MarketKpiRow[],
  channels: CommerceChannelKpiRow[],
  limit?: number
) {
  const top = clampLimit(limit);

  const productsByRevenue = toRanking(products, (p) => p.productId, (p) => p.productName, (p) => p.revenueCents, top);
  const productsByUnits = toRanking(products, (p) => p.productId, (p) => p.productName, (p) => p.unitsSold, top);
  const productsByConversion = toRanking(
    products.filter((p) => p.views > 0),
    (p) => p.productId,
    (p) => p.productName,
    (p) => p.cartConversion,
    top
  );
  const productsByMargin = toRanking(
    products.filter((p) => p.contributionCents > 0),
    (p) => p.productId,
    (p) => p.productName,
    (p) => p.contributionCents,
    top
  );
  const categoriesByRevenue = toRanking(categories, (c) => c.categoryId, (c) => c.categoryId, (c) => c.revenueCents, top);
  const marketsByRevenue = toRanking(markets, (m) => m.market, (m) => m.market, (m) => m.revenueCents, top);
  const channelsByRevenue = toRanking(channels, (c) => c.channel, (c) => c.channel, (c) => c.revenueCents, top);

  return {
    productsByRevenue,
    productsByUnits,
    productsByConversion,
    productsByMargin,
    categoriesByRevenue,
    marketsByRevenue,
    channelsByRevenue,
  };
}

function toRanking<T>(
  rows: T[],
  key: (row: T) => string,
  label: (row: T) => string,
  value: (row: T) => number,
  limit: number
): RankingRow[] {
  return [...rows]
    .sort((a, b) => value(b) - value(a))
    .slice(0, limit)
    .map((row) => ({ key: key(row), label: label(row), value: value(row) }));
}
