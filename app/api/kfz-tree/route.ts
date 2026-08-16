import { NextResponse } from "next/server";
import { getKfzMains, kfzShopBridge } from "@/lib/categories/kfzTree";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mainId = searchParams.get("main_id");

  if (mainId) {
    const main = getKfzMains().find((item) => item.kfz_id === mainId.padStart(2, "0"));
    if (!main) {
      return NextResponse.json({ error: "not_found", main_id: mainId }, { status: 404 });
    }
    return NextResponse.json(main);
  }

  return NextResponse.json({
    version: kfzShopBridge.version,
    shop_automotive_root_id: kfzShopBridge.shop_automotive_root_id,
    url_prefix: kfzShopBridge.url_prefix,
    main_category_count: kfzShopBridge.main_category_count,
    subcategory_count: kfzShopBridge.subcategory_count,
    mains: getKfzMains(),
  });
}
