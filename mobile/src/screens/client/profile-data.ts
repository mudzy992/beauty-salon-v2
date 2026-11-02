export interface ConsentItem {
  imageId: string;
  serviceName: string;
  serviceDate: string;
  isBefore: boolean;
  isAfter: boolean;
  previewUrl: string;
  consentedAt: string | null;
  isPublished: boolean;
  publishedCategories: Array<{ id: string; name: string }>;
}

export interface ConsentPayload {
  policyVersion: string;
  consentText: string;
  pending: ConsentItem[];
  active: ConsentItem[];
}

export interface ProfileDebt {
  id: string;
  amount: number | string;
  createdAt: string;
  service?: { name?: string } | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeConsentPreviewUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/^\/+/, '');
  return /^api\/uploads\/content\?path=private(?:%2f|\/)/i.test(normalized)
    ? `/${normalized}`
    : '';
}

function normalizeConsentItem(value: unknown): ConsentItem | null {
  if (
    !isRecord(value) ||
    typeof value.imageId !== 'string' ||
    !value.imageId.trim() ||
    typeof value.serviceName !== 'string' ||
    typeof value.serviceDate !== 'string' ||
    !value.serviceDate.trim() ||
    typeof value.isBefore !== 'boolean' ||
    typeof value.isAfter !== 'boolean' ||
    typeof value.isPublished !== 'boolean' ||
    (value.consentedAt !== null && typeof value.consentedAt !== 'string') ||
    !Array.isArray(value.publishedCategories)
  ) {
    return null;
  }

  const previewUrl = normalizeConsentPreviewUrl(value.previewUrl);
  if (!previewUrl) return null;
  const categories: Array<{ id: string; name: string }> = [];
  for (const category of value.publishedCategories) {
    if (
      !isRecord(category) ||
      typeof category.id !== 'string' ||
      !category.id.trim() ||
      typeof category.name !== 'string'
    ) {
      return null;
    }
    categories.push({ id: category.id, name: category.name });
  }
  if (value.isPublished !== (categories.length > 0)) return null;

  return {
    imageId: value.imageId,
    serviceName: value.serviceName,
    serviceDate: value.serviceDate,
    isBefore: value.isBefore,
    isAfter: value.isAfter,
    previewUrl,
    consentedAt: value.consentedAt,
    isPublished: value.isPublished,
    publishedCategories: categories,
  };
}

function normalizeConsentItems(value: unknown): ConsentItem[] | null {
  if (!Array.isArray(value)) return null;
  const items: ConsentItem[] = [];
  for (const row of value) {
    const item = normalizeConsentItem(row);
    if (!item) return null;
    items.push(item);
  }
  return items;
}

export function normalizeConsentPayload(value: unknown): ConsentPayload | null {
  if (
    !isRecord(value) ||
    typeof value.policyVersion !== 'string' ||
    !value.policyVersion.trim() ||
    typeof value.consentText !== 'string' ||
    !value.consentText.trim() ||
    !Array.isArray(value.pending) ||
    !Array.isArray(value.active)
  ) {
    return null;
  }

  const pending = normalizeConsentItems(value.pending);
  const active = normalizeConsentItems(value.active);
  if (!pending || !active) return null;
  const imageIds = new Set<string>();
  for (const item of [...pending, ...active]) {
    if (imageIds.has(item.imageId)) return null;
    imageIds.add(item.imageId);
  }

  return {
    policyVersion: value.policyVersion,
    consentText: value.consentText,
    pending,
    active,
  };
}

export function normalizeProfileDebts(value: unknown): ProfileDebt[] | null {
  if (!Array.isArray(value)) return null;
  const debts: ProfileDebt[] = [];
  for (const row of value) {
    if (
      !isRecord(row) ||
      typeof row.id !== 'string' ||
      !row.id.trim() ||
      (typeof row.amount !== 'number' && typeof row.amount !== 'string') ||
      (typeof row.amount === 'string' && !row.amount.trim()) ||
      typeof row.createdAt !== 'string' ||
      !row.createdAt.trim()
    ) {
      return null;
    }
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount < 0) return null;

    let service: ProfileDebt['service'] = null;
    if (row.service !== null) {
      if (
        !isRecord(row.service) ||
        typeof row.service.name !== 'string'
      ) {
        return null;
      }
      service = { name: row.service.name };
    }
    debts.push({
      id: row.id,
      amount,
      createdAt: row.createdAt,
      service,
    });
  }
  return debts;
}

export function formatProfileDate(value: string, format: (date: string) => string): string {
  if (!value) return '';
  try {
    return format(value);
  } catch {
    return value.slice(0, 10);
  }
}

export function formatProfileAmount(value: number | string): string | null {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : null;
}
