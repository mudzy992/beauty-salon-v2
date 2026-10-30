import type {
  ClientDebt,
  DailyLogEntry,
  Notification,
  Reservation,
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
