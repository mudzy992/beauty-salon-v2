import api from "./api";

const PAGE_SIZE = 50;
const MAX_OFFSET = 1000;
const MAX_PAGES = Math.floor(MAX_OFFSET / PAGE_SIZE) + 1;
const MAX_ITEMS = MAX_PAGES * PAGE_SIZE;

type CatalogParams = Record<string, string | boolean | undefined>;

interface CatalogPage<T> {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  nextPage?: number | null;
}

async function fetchAllPages<T>(
  path: string,
  params: CatalogParams = {},
): Promise<T[]> {
  const items: T[] = [];
  let page = 0;

  for (let requestCount = 0; requestCount < MAX_PAGES; requestCount += 1) {
    const { data } = await api.get<CatalogPage<T> | T[]>(path, {
      params: { ...params, page, pageSize: PAGE_SIZE },
    });
    if (Array.isArray(data)) {
      items.push(...data.slice(0, MAX_ITEMS));
      break;
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
      throw new Error('Invalid service catalogue page');
    }
    if (
      (data.hasMore !== undefined && typeof data.hasMore !== 'boolean') ||
      (data.total !== undefined && (!Number.isSafeInteger(data.total) || data.total < 0)) ||
      (data.nextPage !== undefined && data.nextPage !== null &&
        (!Number.isSafeInteger(data.nextPage) || data.nextPage < 0))
    ) {
      throw new Error('Invalid service catalogue pagination metadata');
    }

    const pageItems = data.items;
    items.push(...pageItems.slice(0, MAX_ITEMS - items.length));
    const hasMore =
      data.hasMore ??
      (items.length < (data.total ?? items.length) &&
        (page + 1) * PAGE_SIZE <= MAX_OFFSET);
    const nextPage = data.nextPage ?? (hasMore ? page + 1 : null);
    if (!hasMore || nextPage == null || items.length >= MAX_ITEMS) break;
    page = nextPage;
  }

  return items;
}

export const fetchAllPublicServiceCategories = <T>(
  params: { activeOnly?: string | boolean } = {},
): Promise<T[]> => fetchAllPages<T>("/api/services/categories", params);

export const fetchAllPublicServiceSubcategories = <T>(
  params: { activeOnly?: string | boolean; categoryId?: string } = {},
): Promise<T[]> => fetchAllPages<T>("/api/services/subcategories", params);

export const fetchAllPublicServices = <T>(
  params: {
    activeOnly?: string | boolean;
    subcategoryId?: string;
  } = {},
): Promise<T[]> => fetchAllPages<T>("/api/services", params);

export const fetchAllPublicStylistServices = <T>(
  stylistProfileId: string,
): Promise<T[]> =>
  fetchAllPages<T>(
    `/api/stylists/${encodeURIComponent(stylistProfileId)}/services`,
  );

export const fetchAllPublicStylists = <T>(
  params: { activeOnly?: string | boolean } = {},
): Promise<T[]> => fetchAllPages<T>("/api/stylists", params);
