import type {
  ClientDebt,
  DailyLogEntry,
  Notification,
  Reservation,
  ReservationPaymentSummary,
  Service,
  ServiceCategory,
} from '../types';

export interface DebtAmountRow {
  amount: number;
}

export interface LoyaltyPreview {
  enabled: boolean;
  hasAccount: boolean;
  redeemEnabled?: boolean;
  points?: number;
  tier?: string | null;
  tierMaxDiscountPercent?: number;
  globalMaxDiscountPercent?: number;
  minPointsToRedeem?: number;
  service?: {
    id: string;
    price: number;
    maxDiscountPercent: number;
    maxDiscountAmount: number;
    maxUsablePoints: number;
  } | null;
}

export interface BeforeAfterPairPayload {
  id: string;
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
}

export interface AvailabilityChangedPayload {
  serviceId?: string;
  serviceIds?: string[];
  date?: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

export function normalizePublicServices(payload: unknown): Service[] | null {
  if (!Array.isArray(payload)) return null;
  const services = payload.filter((row): row is Service => {
    if (
      !isRecord(row) || !isNonEmptyString(row.id) || !isNonEmptyString(row.subcategoryId) ||
      !isNonEmptyString(row.name) || !isFiniteNumber(row.durationMinutes) ||
      !isFiniteNumber(row.price) || typeof row.isActive !== 'boolean' ||
      !isFiniteNumber(row.sortOrder) || (row.gender !== 'MALE' && row.gender !== 'FEMALE') ||
      !isOptionalString(row.shortDescription) || !isOptionalString(row.heroImage)
    ) return false;
    if (row.subcategory !== undefined && row.subcategory !== null) {
      if (
        !isRecord(row.subcategory) || !isNonEmptyString(row.subcategory.id) ||
        !isNonEmptyString(row.subcategory.categoryId) || !isNonEmptyString(row.subcategory.name)
      ) return false;
    }
    return true;
  });
  return payload.length > 0 && services.length === 0 ? null : services;
}

export function normalizePublicServiceCategories(payload: unknown): ServiceCategory[] | null {
  if (!Array.isArray(payload)) return null;
  const categories = payload.filter((row): row is ServiceCategory =>
    isRecord(row) && isNonEmptyString(row.id) && isNonEmptyString(row.name) &&
    isFiniteNumber(row.sortOrder) && typeof row.isActive === 'boolean' &&
    isOptionalString(row.description)
  );
  return payload.length > 0 && categories.length === 0 ? null : categories;
}

export interface PublicReviewPayload {
  id: string;
  serviceRating: number;
  comment?: string | null;
  createdAt: string;
  user?: { firstName?: string | null; lastName?: string | null } | null;
  service?: { name: string } | null;
}

export interface PublicReviewPagePayload {
  items: PublicReviewPayload[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

function normalizePublicReview(payload: unknown): PublicReviewPayload | null {
  if (
    !isRecord(payload) || !isNonEmptyString(payload.id) ||
    !isFiniteNumber(payload.serviceRating) || payload.serviceRating < 1 || payload.serviceRating > 5 ||
    !isNonEmptyString(payload.createdAt) || !isOptionalString(payload.comment)
  ) return null;
  let user: PublicReviewPayload['user'];
  if (payload.user === null) user = null;
  else if (payload.user !== undefined) {
    if (
      !isRecord(payload.user) || !isOptionalString(payload.user.firstName) ||
      !isOptionalString(payload.user.lastName)
    ) return null;
    user = { firstName: payload.user.firstName as string | null | undefined, lastName: payload.user.lastName as string | null | undefined };
  }
  let service: PublicReviewPayload['service'];
  if (payload.service === null) service = null;
  else if (payload.service !== undefined) {
    if (!isRecord(payload.service) || !isNonEmptyString(payload.service.name)) return null;
    service = { name: payload.service.name };
  }
  return {
    id: payload.id,
    serviceRating: payload.serviceRating,
    comment: payload.comment as string | null | undefined,
    createdAt: payload.createdAt,
    user,
    service,
  };
}

export function normalizePublicReviewPage(
  payload: unknown,
  offset: number,
  pageSize: number,
): PublicReviewPagePayload | null {
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(pageSize) || pageSize <= 0) return null;
  let rawItems: unknown[];
  let total: number;
  let hasMore: boolean | undefined;
  let nextOffset: number;
  if (Array.isArray(payload)) {
    total = payload.length;
    rawItems = payload.slice(offset, offset + pageSize);
    nextOffset = offset + rawItems.length;
  } else {
    if (!isRecord(payload) || !Array.isArray(payload.items)) return null;
    rawItems = payload.items;
    total = payload.total === undefined ? rawItems.length : payload.total as number;
    hasMore = payload.hasMore as boolean | undefined;
    nextOffset = payload.nextOffset === undefined ? offset + rawItems.length : payload.nextOffset as number;
    if (!Number.isSafeInteger(total) || total < 0) return null;
    if (hasMore !== undefined && typeof hasMore !== 'boolean') return null;
    if (!Number.isSafeInteger(nextOffset) || nextOffset < 0) return null;
  }
  const items = rawItems.map(normalizePublicReview).filter((item): item is PublicReviewPayload => item !== null);
  if (rawItems.length > 0 && items.length === 0) return null;
  const effectiveNextOffset = nextOffset;
  return {
    items,
    total,
    hasMore: hasMore ?? effectiveNextOffset < total,
    nextOffset: effectiveNextOffset,
  };
}

export function normalizeDebtAmounts(payload: unknown): DebtAmountRow[] | null {
  if (!Array.isArray(payload)) return null;
  const result: DebtAmountRow[] = [];
  for (const row of payload) {
    if (!isRecord(row)) return null;
    const amount = finiteNumber(row.amount);
    if (amount === null || amount < 0) return null;
    result.push({ amount });
  }
  return result;
}

export function normalizeLoyaltyPreview(payload: unknown): LoyaltyPreview | null {
  if (!isRecord(payload) || typeof payload.enabled !== 'boolean' || typeof payload.hasAccount !== 'boolean') {
    return null;
  }
  if (payload.redeemEnabled !== undefined && typeof payload.redeemEnabled !== 'boolean') return null;
  if (payload.tier !== undefined && payload.tier !== null && typeof payload.tier !== 'string') return null;

  const numericFields = [
    'points',
    'tierMaxDiscountPercent',
    'globalMaxDiscountPercent',
    'minPointsToRedeem',
  ] as const;
  for (const field of numericFields) {
    if (payload[field] !== undefined && (finiteNumber(payload[field]) === null || Number(payload[field]) < 0)) {
      return null;
    }
  }

  let service: LoyaltyPreview['service'];
  if (payload.service === null) {
    service = null;
  } else if (payload.service !== undefined) {
    if (!isRecord(payload.service) || !isNonEmptyString(payload.service.id)) return null;
    const price = finiteNumber(payload.service.price);
    const maxDiscountPercent = finiteNumber(payload.service.maxDiscountPercent);
    const maxDiscountAmount = finiteNumber(payload.service.maxDiscountAmount);
    const maxUsablePoints = finiteNumber(payload.service.maxUsablePoints);
    if (
      price === null || price < 0 ||
      maxDiscountPercent === null || maxDiscountPercent < 0 || maxDiscountPercent > 100 ||
      maxDiscountAmount === null || maxDiscountAmount < 0 ||
      maxUsablePoints === null || maxUsablePoints < 0
    ) return null;
    service = {
      id: payload.service.id,
      price,
      maxDiscountPercent,
      maxDiscountAmount,
      maxUsablePoints,
    };
  }

  return {
    enabled: payload.enabled,
    hasAccount: payload.hasAccount,
    ...(payload.redeemEnabled === undefined ? {} : { redeemEnabled: payload.redeemEnabled }),
    ...(payload.points === undefined ? {} : { points: finiteNumber(payload.points)! }),
    ...(payload.tier === undefined ? {} : { tier: payload.tier as string | null }),
    ...(payload.tierMaxDiscountPercent === undefined ? {} : { tierMaxDiscountPercent: finiteNumber(payload.tierMaxDiscountPercent)! }),
    ...(payload.globalMaxDiscountPercent === undefined ? {} : { globalMaxDiscountPercent: finiteNumber(payload.globalMaxDiscountPercent)! }),
    ...(payload.minPointsToRedeem === undefined ? {} : { minPointsToRedeem: finiteNumber(payload.minPointsToRedeem)! }),
    ...(payload.service === undefined ? {} : { service }),
  };
}

export function normalizeNotifications(payload: unknown): Notification[] | null {
  if (!Array.isArray(payload)) return null;
  const result: Notification[] = [];
  for (const row of payload) {
    if (
      !isRecord(row) ||
      !isNonEmptyString(row.id) ||
      !isNonEmptyString(row.userId) ||
      typeof row.title !== 'string' ||
      typeof row.body !== 'string' ||
      !isNonEmptyString(row.type) ||
      typeof row.isRead !== 'boolean' ||
      typeof row.sentAt !== 'string' || Number.isNaN(Date.parse(row.sentAt)) ||
      (row.channel !== 'PUSH' && row.channel !== 'EMAIL' && row.channel !== 'BOTH') ||
      (row.data !== undefined && row.data !== null && !isRecord(row.data)) ||
      !isOptionalString(row.readAt)
    ) return null;
    result.push(row as unknown as Notification);
  }
  return result;
}

function normalizeImageSide(value: unknown): BeforeAfterPairPayload['before'] | null {
  if (!isRecord(value) || !hasImagePath(value)) return null;
  const pathOriginal = [value.pathOriginal, value.pathMedium, value.pathThumb]
    .find(isNonEmptyString);
  if (!pathOriginal) return null;
  return {
    pathOriginal,
    ...(isOptionalString(value.pathMedium) ? { pathMedium: value.pathMedium as string | null | undefined } : {}),
    ...(isOptionalString(value.pathThumb) ? { pathThumb: value.pathThumb as string | null | undefined } : {}),
  };
}

function hasImagePath(value: Record<string, unknown>): boolean {
  return ['pathMedium', 'pathThumb', 'pathOriginal'].some((key) => isNonEmptyString(value[key]));
}

export function normalizeBeforeAfterPairs(payload: unknown): BeforeAfterPairPayload[] | null {
  if (!Array.isArray(payload)) return null;
  const result: BeforeAfterPairPayload[] = [];
  for (const row of payload) {
    if (!isRecord(row) || !isNonEmptyString(row.id)) continue;
    const before = normalizeImageSide(row.before);
    const after = normalizeImageSide(row.after);
    if (!before || !after) continue;
    result.push({ id: row.id, before, after });
  }
  return result;
}

export interface BeforeAfterPagePayload {
  items: BeforeAfterPairPayload[];
  hasMore: boolean;
  nextOffset: number;
}

export function normalizeBeforeAfterPage(payload: unknown): BeforeAfterPagePayload | null {
  if (!isRecord(payload)) return null;
  const items = normalizeBeforeAfterPairs(payload.items);
  if (
    !items || typeof payload.hasMore !== 'boolean' ||
    !Number.isSafeInteger(payload.nextOffset) || (payload.nextOffset as number) < 0
  ) return null;
  return { items, hasMore: payload.hasMore, nextOffset: payload.nextOffset as number };
}

const RESERVATION_STATUSES = new Set([
  'PENDING', 'STYLIST_REVIEW', 'CONFIRMED', 'ATTENDANCE_CONFIRMED',
  'IN_PROGRESS', 'AWAITING_DAILY_LOG', 'COMPLETED', 'CANCELLED_BY_CLIENT',
  'CANCELLED_BY_STYLISTS', 'NO_SHOW',
]);

function isReservationRow(row: unknown): row is Reservation {
  if (
    !isRecord(row) ||
    !isNonEmptyString(row.id) ||
    !isNonEmptyString(row.reservationDate) ||
    !isNonEmptyString(row.startTime) ||
    !isNonEmptyString(row.endTime) ||
    typeof row.status !== 'string' || !RESERVATION_STATUSES.has(row.status)
  ) return false;
  if (row.items !== undefined && row.items !== null && (
    !Array.isArray(row.items) ||
    row.items.some((item) => !isRecord(item) || (item.service != null && !isRecord(item.service)))
  )) return false;
  if (row.service != null && (!isRecord(row.service) || !isNonEmptyString(row.service.name))) return false;
  if (row.stylistResponses !== undefined && (
    !Array.isArray(row.stylistResponses) ||
    row.stylistResponses.some((item) => !isRecord(item) || !isNonEmptyString(item.stylistProfileId))
  )) return false;
  return true;
}

export function normalizeReservations(payload: unknown): Reservation[] | null {
  if (!Array.isArray(payload)) return null;
  return payload.filter(isReservationRow);
}

export type ReservationDetailPayload = Reservation & {
  paymentSummary?: ReservationPaymentSummary | null;
};

function isReservationPaymentSummary(value: unknown): value is ReservationPaymentSummary {
  return (
    isRecord(value) &&
    isNonEmptyString(value.publicReferenceCode) &&
    isFiniteNumber(value.actualPrice) &&
    isFiniteNumber(value.tipAmount) &&
    isFiniteNumber(value.serviceAmount) &&
    isFiniteNumber(value.loyaltyDiscountAmount) &&
    typeof value.completedAt === 'string' &&
    !Number.isNaN(Date.parse(value.completedAt)) &&
    Array.isArray(value.items) &&
    value.items.every((item) =>
      isRecord(item) && typeof item.name === 'string' && isFiniteNumber(item.unitPrice),
    )
  );
}

export function normalizeReservationDetail(payload: unknown): ReservationDetailPayload | null {
  if (!isRecord(payload)) return null;
  const reservations = normalizeReservations([payload]);
  if (!reservations || reservations.length !== 1) return null;
  if (
    payload.paymentSummary !== undefined &&
    payload.paymentSummary !== null &&
    !isReservationPaymentSummary(payload.paymentSummary)
  ) return null;
  return {
    ...reservations[0],
    paymentSummary: payload.paymentSummary as ReservationPaymentSummary | null | undefined,
  };
}

export interface ClientSearchRow {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
}

export function normalizeClientSearchResults(payload: unknown): ClientSearchRow[] | null {
  if (!isRecord(payload) || !Array.isArray(payload.items)) return null;
  return payload.items.filter((row): row is ClientSearchRow =>
    isRecord(row) &&
    isNonEmptyString(row.id) &&
    isNonEmptyString(row.username) &&
    (row.firstName === null || typeof row.firstName === 'string') &&
    (row.lastName === null || typeof row.lastName === 'string') &&
    (row.gender === undefined || row.gender === null || row.gender === 'MALE' || row.gender === 'FEMALE')
  );
}

function isDailyLogRow(row: unknown): row is DailyLogEntry {
  if (
    !isRecord(row) ||
    !isNonEmptyString(row.id) ||
    !isNonEmptyString(row.date) ||
    (row.status !== 'PENDING' && row.status !== 'COMPLETED') ||
    finiteNumber(row.actualPrice) === null ||
    finiteNumber(row.tipAmount) === null
  ) return false;
  if (row.items !== undefined && (
    !Array.isArray(row.items) || row.items.some((item) => !isRecord(item))
  )) return false;
  if (row.debtPaymentEntries !== undefined && (
    !Array.isArray(row.debtPaymentEntries) ||
    row.debtPaymentEntries.some((item) => !isRecord(item) || finiteNumber(item.actualPrice) === null)
  )) return false;
  return true;
}

export function normalizeDailyLogEntries(payload: unknown): DailyLogEntry[] | null {
  if (!Array.isArray(payload)) return null;
  return payload.filter(isDailyLogRow);
}

export interface StylistDebtRowPayload extends ClientDebt {
  client: { id: string; username: string; firstName: string | null; lastName: string | null };
  reservation?: { id: string; publicReferenceCode: string | null } | null;
  dailyLogEntry?: { id: string; date: string } | null;
  manualEntry?: { id: string; date: string } | null;
}

export function normalizeStylistDebtRows(payload: unknown): StylistDebtRowPayload[] | null {
  const debts = normalizeClientDebts(payload);
  if (!debts || !Array.isArray(payload)) return debts === null ? null : [];
  const result: StylistDebtRowPayload[] = [];
  for (let index = 0; index < payload.length; index += 1) {
    const row = payload[index];
    if (!isRecord(row) || !isRecord(row.client)) return null;
    const client = row.client;
    if (
      !isNonEmptyString(client.id) || !isNonEmptyString(client.username) ||
      !(client.firstName === null || typeof client.firstName === 'string') ||
      !(client.lastName === null || typeof client.lastName === 'string')
    ) return null;

    for (const field of ['reservation', 'dailyLogEntry', 'manualEntry'] as const) {
      if (row[field] === undefined || row[field] === null) continue;
      if (!isRecord(row[field]) || !isNonEmptyString(row[field].id)) return null;
      if (field === 'reservation') {
        if (row[field].publicReferenceCode !== null && typeof row[field].publicReferenceCode !== 'string') return null;
      } else if (
        typeof row[field].date !== 'string' || Number.isNaN(Date.parse(row[field].date))
      ) return null;
    }
    result.push({ ...debts[index], ...row, client } as unknown as StylistDebtRowPayload);
  }
  return result;
}

export function normalizeClientDebts(payload: unknown): ClientDebt[] | null {
  if (!Array.isArray(payload)) return null;
  const result: ClientDebt[] = [];
  for (const row of payload) {
    if (
      !isRecord(row) ||
      !isNonEmptyString(row.id) ||
      !isNonEmptyString(row.clientId) ||
      !isNonEmptyString(row.stylistProfileId) ||
      !isNonEmptyString(row.createdById) ||
      typeof row.createdAt !== 'string' || Number.isNaN(Date.parse(row.createdAt)) ||
      (row.status !== 'OPEN' && row.status !== 'SETTLED')
    ) return null;
    const amount = finiteNumber(row.amount);
    if (amount === null || amount < 0) return null;
    if (row.service != null && (
      !isRecord(row.service) ||
      !isNonEmptyString(row.service.id) ||
      typeof row.service.name !== 'string'
    )) return null;
    if (row.stylistProfile != null && !isRecord(row.stylistProfile)) return null;
    result.push({ ...row, amount } as unknown as ClientDebt);
  }
  return result;
}

export function normalizeAvailabilityChangedPayload(payload: unknown): AvailabilityChangedPayload | null {
  if (!isRecord(payload)) return null;
  if (payload.serviceId !== undefined && !isNonEmptyString(payload.serviceId)) return null;
  if (payload.serviceIds !== undefined && (
    !Array.isArray(payload.serviceIds) || payload.serviceIds.some((id) => !isNonEmptyString(id))
  )) return null;
  if (payload.date !== undefined && (
    typeof payload.date !== 'string' || Number.isNaN(Date.parse(`${payload.date}T00:00:00`))
  )) return null;
  if (payload.serviceId === undefined && payload.serviceIds === undefined) return null;
  return payload as AvailabilityChangedPayload;
}

export function sumDebtAmounts(rows: ClientDebt[] | DebtAmountRow[]): number {
  return rows.reduce((total, row) => total + Number(row.amount), 0);
}
