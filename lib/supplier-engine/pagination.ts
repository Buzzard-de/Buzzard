export type PaginationMode = "page" | "offset" | "cursor" | "nextPageToken" | "linkHeader" | "pageNumber";

export interface PaginationState {
  mode: PaginationMode;
  page?: number;
  offset?: number;
  cursor?: string;
  nextPageToken?: string;
  pageSize: number;
  pageParam?: string;
  pageSizeParam?: string;
}

export interface PaginationResult {
  next?: PaginationState;
  hasMore: boolean;
  nextCursor?: string;
  nextPageToken?: string;
  nextLink?: string;
}

export function parseLinkHeader(linkHeader?: string): string | undefined {
  if (!linkHeader) return undefined;
  const parts = linkHeader.split(",");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="?next"?/i);
    if (match) return match[1];
  }
  return undefined;
}

export function buildPaginationQuery(state: PaginationState): Record<string, string> {
  const query: Record<string, string> = {};
  const pageKey = state.pageParam || "page";
  const pageSizeKey = state.pageSizeParam || "pageSize";
  switch (state.mode) {
    case "pageNumber":
      query[pageKey] = String(state.page ?? 0);
      query[pageSizeKey] = String(state.pageSize);
      break;
    case "page":
      query[pageKey] = String(state.page ?? 1);
      query[pageSizeKey] = String(state.pageSize);
      break;
    case "offset":
      query.offset = String(state.offset ?? 0);
      query.limit = String(state.pageSize);
      break;
    case "cursor":
      if (state.cursor) query.cursor = state.cursor;
      query.limit = String(state.pageSize);
      break;
    case "nextPageToken":
      if (state.nextPageToken) query.pageToken = state.nextPageToken;
      query.pageSize = String(state.pageSize);
      break;
    default:
      query.limit = String(state.pageSize);
      break;
  }
  return query;
}

export function advancePagination(
  state: PaginationState,
  response: {
    records: unknown[];
    cursor?: string;
    nextPageToken?: string;
    linkHeader?: string;
    hasNextPage?: boolean;
  }
): PaginationResult {
  const hasMore = response.hasNextPage ?? response.records.length >= state.pageSize;
  const nextLink = parseLinkHeader(response.linkHeader);

  switch (state.mode) {
    case "pageNumber":
      return {
        hasMore,
        next: hasMore ? { ...state, page: (state.page ?? 0) + 1 } : undefined,
      };
    case "page":
      return {
        hasMore,
        next: hasMore ? { ...state, page: (state.page ?? 1) + 1 } : undefined,
      };
    case "offset":
      return {
        hasMore,
        next: hasMore
          ? { ...state, offset: (state.offset ?? 0) + state.pageSize }
          : undefined,
      };
    case "cursor":
      return {
        hasMore: Boolean(response.cursor),
        nextCursor: response.cursor,
        next: response.cursor ? { ...state, cursor: response.cursor } : undefined,
      };
    case "nextPageToken":
      return {
        hasMore: Boolean(response.nextPageToken),
        nextPageToken: response.nextPageToken,
        next: response.nextPageToken ? { ...state, nextPageToken: response.nextPageToken } : undefined,
      };
    case "linkHeader":
      return {
        hasMore: Boolean(nextLink),
        nextLink,
      };
    default:
      return { hasMore: false };
  }
}
