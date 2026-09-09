import testFeeds from "@/data/global/test_supplier_feeds.json";
import suppliersMaster from "@/data/buzzard_suppliers.json";

type TestFeedEntry = (typeof testFeeds)[keyof typeof testFeeds];

export const TEST_SUPPLIER_ID = "TEST_SUPPLIER_A";

export function getTestFeedEntry(supplierId: string): TestFeedEntry | undefined {
  return (testFeeds as Record<string, TestFeedEntry>)[supplierId];
}

export function getTestFeedProducts(supplierId: string): Record<string, unknown>[] {
  const entry = getTestFeedEntry(supplierId);
  return (entry?.apiProducts as Record<string, unknown>[]) ?? [];
}

export function getTestXmlFeed(supplierId: string): string {
  return getTestFeedEntry(supplierId)?.xmlFeed ?? "";
}

export function getTestCsvFeed(supplierId: string): string {
  return getTestFeedEntry(supplierId)?.csvFeed ?? "";
}

export function getBuzzardSuppliersMaster() {
  return suppliersMaster.suppliers;
}
