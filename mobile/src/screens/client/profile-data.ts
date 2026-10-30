export interface ConsentItem {
  imageId: string;
  serviceName: string;
  serviceDate: string;
  isBefore: boolean;
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
  if (!isRecord(value) || typeof value.imageId !== 'string' || !value.imageId) {
    return null;
  }

  const categories = Array.isArray(value.publishedCategories)
    ? value.publishedCategories
        .filter(
          (category): category is { id: string; name: string } =>
            isRecord(category) &&
            typeof category.id === 'string' &&
            typeof category.name === 'string',
        )
    : [];

  return {
    imageId: value.imageId,
    serviceName: typeof value.serviceName === 'string' ? value.serviceName : '',
    serviceDate: typeof value.serviceDate === 'string' ? value.serviceDate : '',
    isBefore: value.isBefore === true,
    previewUrl: normalizeConsentPreviewUrl(value.previewUrl),
    consentedAt: typeof value.consentedAt === 'string' ? value.consentedAt : null,
    isPublished: value.isPublished === true && categories.length > 0,
    publishedCategories: categories,
  };
}

function normalizeConsentItems(value: unknown): ConsentItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeConsentItem)
    .filter((item): item is ConsentItem => item !== null);
}

export function normalizeConsentPayload(value: unknown): ConsentPayload | null {
  if (
    !isRecord(value) ||
    typeof value.policyVersion !== 'string' ||
    value.policyVersion.length === 0 ||
    typeof value.consentText !== 'string' ||
    !Array.isArray(value.pending) ||
    !Array.isArray(value.active)
  ) {
    return null;
  }

  return {
    policyVersion: value.policyVersion,
    consentText: value.consentText,
    pending: normalizeConsentItems(value.pending),
    active: normalizeConsentItems(value.active),
  };
}

export function normalizeProfileDebts(value: unknown): ProfileDebt[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((debt): debt is Record<string, unknown> => isRecord(debt) && typeof debt.id === 'string')
    .map((debt) => ({
      id: debt.id as string,
      amount:
        typeof debt.amount === 'number' || typeof debt.amount === 'string'
          ? debt.amount
          : 0,
      createdAt: typeof debt.createdAt === 'string' ? debt.createdAt : '',
      service: isRecord(debt.service)
        ? { name: typeof debt.service.name === 'string' ? debt.service.name : undefined }
        : null,
    }));
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
