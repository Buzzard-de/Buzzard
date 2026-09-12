import type { SearchConsoleReportRow } from "./types";

/** Foundation adapter — no live credentials, no fabricated production data. */
export interface SearchConsoleAdapter {
  id: "SEARCH_CONSOLE_ADAPTER";
  isConfigured(): boolean;
  fetchReport(_params: { siteUrl: string; startDate: string; endDate: string }): Promise<SearchConsoleReportRow[]>;
}

export const SearchConsoleAdapterFoundation: SearchConsoleAdapter = {
  id: "SEARCH_CONSOLE_ADAPTER",
  isConfigured() {
    return false;
  },
  async fetchReport() {
    return [];
  },
};
