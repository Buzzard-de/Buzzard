import { NextResponse } from "next/server";
import {
  getKfzCompetitors,
  getKfzMains,
  kfzIntelligence,
  kfzShopBridge,
} from "@/lib/categories/kfzTree";

export const dynamic = "force-static";

export async function GET() {
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
    coverage: kfzIntelligence.coverage,
    mains: getKfzMains(),
  });
}
