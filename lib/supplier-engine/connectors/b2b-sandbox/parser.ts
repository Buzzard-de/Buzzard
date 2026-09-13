import { safeParseJson } from "../../network/responseSecurity";

/** XXE-safe XML parsing — no external entity resolution, regex-based extraction. */
export function parseSafeXmlProducts(xml: string, itemTag = "product"): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  if (!xml?.trim()) return records;

  if (/<!ENTITY/i.test(xml) || /SYSTEM\s+["']/i.test(xml)) {
    throw new Error("XXE_BLOCKED");
  }

  const blocks = xml.match(new RegExp(`<${itemTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${itemTag}>`, "gi")) || [];
  for (const block of blocks) {
    const record: Record<string, unknown> = {};
    const tagPattern = /<([\w:-]+)(?:\s[^>]*)?>([^<]*)<\/\1>/g;
    let match;
    while ((match = tagPattern.exec(block)) !== null) {
      const key = match[1].replace(/^.*:/, "");
      let value = match[2].trim();
      if (value.startsWith("<![CDATA[") && value.endsWith("]]>")) {
        value = value.slice(9, -3);
      }
      record[key] = /^\d+(\.\d+)?$/.test(value) ? Number(value) : value;
    }
    if (Object.keys(record).length) records.push(record);
  }
  return records;
}

export interface ParsedSupplierFeed {
  records: Record<string, unknown>[];
  hasNextPage?: boolean;
  totalResults?: number;
}

export function parseSupplierFeedBody(
  body: string,
  format: "json" | "xml"
): { ok: true; records: Record<string, unknown>[]; hasNextPage?: boolean; totalResults?: number } | { ok: false; reason: string } {
  if (format === "xml") {
    try {
      return { ok: true, records: parseSafeXmlProducts(body) };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : "MALFORMED_XML" };
    }
  }

  const parsed = safeParseJson(body);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const data = parsed.data;
  if (Array.isArray(data)) return { ok: true, records: data as Record<string, unknown>[] };
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const records =
      (obj.products as Record<string, unknown>[]) ||
      (obj.items as Record<string, unknown>[]) ||
      (obj.lines as Record<string, unknown>[]) ||
      (obj.data as Record<string, unknown>[]) ||
      [];
    return {
      ok: true,
      records,
      hasNextPage: obj.hasNextPage === true,
      totalResults: typeof obj.totalResults === "number" ? obj.totalResults : undefined,
    };
  }
  return { ok: false, reason: "MALFORMED_JSON" };
}
