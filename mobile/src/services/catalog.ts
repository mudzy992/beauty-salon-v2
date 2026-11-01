import api from "./api";
import { normalizePublicServices } from "../utils/apiPayload";
import type { Service } from "../types";
import { normalizeCatalogPageEnvelope } from "./catalog-pagination";

const PAGE_SIZE = 50;
const MAX_OFFSET = 1000;
const MAX_PAGES = Math.floor(MAX_OFFSET / PAGE_SIZE) + 1;
const MAX_ITEMS = MAX_PAGES * PAGE_SIZE;

type CatalogParams = Record<string, string | boolean | undefined>;

async function fetchAllPages<T>(
  path: string,
  params: CatalogParams = {},
): Promise<T[]> {
  const items: T[] = [];
  let page = 0;
  let completed = false;

  for (let requestCount = 0; requestCount < MAX_PAGES; requestCount += 1) {
    const { data } = await api.get<unknown>(path, {
      params: { ...params, page, pageSize: PAGE_SIZE },
    });
    const normalizedPage = normalizeCatalogPageEnvelope(data, page, PAGE_SIZE, MAX_OFFSET);
    if (!normalizedPage) throw new Error('Invalid service catalogue page');
    if (items.length + normalizedPage.items.length > MAX_ITEMS) {
      throw new Error('Service catalogue exceeds the supported item limit');
    }
    items.push(...(normalizedPage.items as T[]));
    if (!normalizedPage.hasMore) {
      completed = true;
      break;
    }
    if (normalizedPage.nextPage === null) throw new Error('Incomplete service catalogue pagination');
    page = normalizedPage.nextPage;
  }

  if (!completed) throw new Error('Service catalogue pagination exceeded the supported page limit');
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

export async function fetchAllNormalizedPublicServices(
  params: { activeOnly?: string | boolean; subcategoryId?: string } = {},
): Promise<Service[]> {
  const payload = await fetchAllPublicServices<unknown>(params);
  const services = normalizePublicServices(payload);
  if (!services) throw new Error("Invalid public service catalogue payload");
  return services;
}

export const fetchAllPublicStylistServices = <T>(
  stylistProfileId: string,
): Promise<T[]> =>
  fetchAllPages<T>(
    `/api/stylists/${encodeURIComponent(stylistProfileId)}/services`,
  );

export const fetchAllPublicStylists = <T>(
  params: { activeOnly?: string | boolean } = {},
): Promise<T[]> => fetchAllPages<T>("/api/stylists", params);
