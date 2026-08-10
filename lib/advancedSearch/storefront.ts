import { apiBaseUrl, isAdvancedSearchEnabled } from "@/lib/api/config";

export interface SearchSuggestion {
  type: "product" | "keyword";
  text: string;
  sku?: string;
  slug?: string | null;
}

export interface SearchSuggestResponse {
  suggestions: SearchSuggestion[];
}

export async function fetchSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
  if (!isAdvancedSearchEnabled()) return [];
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(
      `${apiBaseUrl()}/api/advanced-search/suggest?q=${encodeURIComponent(q)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as SearchSuggestResponse;
    return data.suggestions || [];
  } catch {
    return [];
  }
}
