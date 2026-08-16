import { NextResponse } from "next/server";
import {
  getKfzCompetitors,
  getKfzMainById,
  getKfzMains,
  kfzIntelligence,
  kfzShopBridge,
} from "@/lib/categories/kfzTree";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mainId = searchParams.get("main_id");

  if (mainId) {
    const main = getKfzMainById(mainId);
    if (!main) {
      return NextResponse.json({ error: "not_found", main_id: mainId }, { status: 404 });
    }
    const coverage = kfzIntelligence.coverage[main.kfz_id] ?? main.competitor_coverage ?? {};
    return NextResponse.json({
      ...main,
      coverage,
      competitors: getKfzCompetitors(),
    });
  }

  return NextResponse.json({
    name: kfzIntelligence.name,
    version: kfzIntelligence.version,
    note: kfzIntelligence.note,
    shop_automotive_root_id: kfzShopBridge.shop_automotive_root_id,
    url_prefix: kfzShopBridge.url_prefix,
    main_category_count: kfzShopBridge.main_category_count,
    subcategory_count: kfzShopBridge.subcategory_count,
    l3_count: kfzShopBridge.l3_count,
    competitors: getKfzCompetitors(),
    mains: getKfzMains(),
  });
}
