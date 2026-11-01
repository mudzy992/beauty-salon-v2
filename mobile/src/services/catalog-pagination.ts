export interface NormalizedCatalogPage {
  items: unknown[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  nextPage: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeCatalogPageEnvelope(
  payload: unknown,
  requestedPage: number,
  requestedPageSize: number,
  maxOffset: number,
): NormalizedCatalogPage | null {
  if (
    !Number.isSafeInteger(requestedPage) || requestedPage < 0 ||
    !Number.isSafeInteger(requestedPageSize) || requestedPageSize <= 0 ||
    !Number.isSafeInteger(maxOffset) || maxOffset < 0
  ) return null;

  if (Array.isArray(payload)) {
    if (requestedPage !== 0) return null;
    return {
      items: payload,
      page: 0,
      pageSize: payload.length,
      total: payload.length,
      hasMore: false,
      nextPage: null,
    };
  }

  if (!isRecord(payload) || !Array.isArray(payload.items)) return null;
  const { items, total, page, pageSize, hasMore, nextPage } = payload;
  if (
    !Number.isSafeInteger(total) || (total as number) < 0 ||
    page !== requestedPage || pageSize !== requestedPageSize ||
    items.length > requestedPageSize || typeof hasMore !== "boolean" ||
    (nextPage !== null && !Number.isSafeInteger(nextPage))
  ) return null;

  const nextOffset = requestedPage * requestedPageSize + items.length;
  if (!Number.isSafeInteger(nextOffset) || nextOffset > (total as number)) return null;
  if (hasMore) {
    if (
      items.length !== requestedPageSize ||
      nextPage !== requestedPage + 1 ||
      nextOffset >= (total as number) ||
      nextOffset > maxOffset
    ) return null;
  } else if (nextPage !== null || (total as number) > nextOffset) {
    return null;
  }

  return {
    items,
    page: requestedPage,
    pageSize: requestedPageSize,
    total: total as number,
    hasMore,
    nextPage: nextPage as number | null,
  };
}
