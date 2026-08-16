import { NextResponse } from "next/server";
import { getKfzMains, kfzShopBridge } from "@/lib/categories/kfzTree";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({
    version: kfzShopBridge.version,
    shop_automotive_root_id: kfzShopBridge.shop_automotive_root_id,
    url_prefix: kfzShopBridge.url_prefix,
    main_category_count: kfzShopBridge.main_category_count,
    subcategory_count: kfzShopBridge.subcategory_count,
    mains: getKfzMains(),
  });
}
