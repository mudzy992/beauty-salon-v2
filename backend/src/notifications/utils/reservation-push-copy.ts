export const PUSH_BODY_MAX = 220;

export type ReservationPushContext = {
  ref: string;
  serviceNames: string[];
  date: string;
  startTime: string;
  endTime: string;
  attendanceRequired: boolean;
};

export const emptyPushContext = (
  reservationId: string,
  ref?: string | null,
): ReservationPushContext => ({
  ref: (ref && ref.trim()) || reservationId.slice(0, 8),
  serviceNames: ['uslugu'],
  date: '',
  startTime: '00:00',
  endTime: '00:00',
  attendanceRequired: true,
});

export const formatPushDate = (value: string | Date): string => {
  const raw =
    typeof value === 'string'
      ? value.slice(0, 10)
      : value.toISOString().slice(0, 10);
  const [y, m, d] = raw.split('-');
  if (!y || !m || !d) return raw;
  return `${d}.${m}.${y}.`;
};

export const formatPushTime = (value: string): string =>
  value.trim().slice(0, 5);

export const formatServiceList = (
  names: string[],
  maxVisible = 3,
): string => {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return 'uslugu';
  if (clean.length <= maxVisible) return clean.join(', ');
  const shown = clean.slice(0, maxVisible);
  return `${shown.join(', ')} i još ${clean.length - maxVisible}`;
};

export const capPushBody = (body: string, max = PUSH_BODY_MAX): string => {
  if (body.length <= max) return body;
  return `${body.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
};

const slotLabel = (ctx: Pick<ReservationPushContext, 'date' | 'startTime' | 'endTime'>): string =>
  `${formatPushDate(ctx.date)} u ${formatPushTime(ctx.startTime)} do ${formatPushTime(ctx.endTime)}`;

const attendanceFooter = (required: boolean): string =>
  required
    ? 'Molimo da potvrdite dolazak.'
    : 'Potvrda dolaska nije potrebna.';

const reservationClause = (
  ctx: Pick<ReservationPushContext, 'ref' | 'serviceNames'>,
): string =>
  `rezervaciju ${ctx.ref}, koja sadrži: ${formatServiceList(ctx.serviceNames)}`;

export const buildTimeChangedCopy = (
  ctx: ReservationPushContext,
): { title: string; body: string } => ({
  title: 'Termin pomjeren',
  body: capPushBody(
    `Termin za ${reservationClause(ctx)} pomjeren je na ${slotLabel(ctx)}. ${attendanceFooter(ctx.attendanceRequired)}`,
  ),
});

export const buildProposalCopy = (
  ctx: ReservationPushContext,
  confirmWithinMinutes: number,
): { title: string; body: string } => ({
  title: 'Prijedlog novog termina',
  body: capPushBody(
    `Za ${reservationClause(ctx)} predlaže se novi termin ${slotLabel(ctx)}. Potvrdite u narednih ${confirmWithinMinutes} min.`,
  ),
});

export const buildRescheduleShiftCopy = (
  ctx: ReservationPushContext,
  shiftMinutes: number,
  confirmWithinMinutes: number,
): { title: string; body: string } => ({
  title: 'Promjena termina',
  body: capPushBody(
    `Termin za ${reservationClause(ctx)} pomjeren je za ${shiftMinutes} min na ${slotLabel(ctx)}. Potvrdite u narednih ${confirmWithinMinutes} min.`,
  ),
});

export const buildConfirmedCopy = (
  ctx: ReservationPushContext,
): { title: string; body: string } => ({
  title: 'Rezervacija potvrđena',
  body: capPushBody(
    `Rezervacija ${ctx.ref} (${formatServiceList(ctx.serviceNames)}) potvrđena je za ${slotLabel(ctx)}. ${attendanceFooter(ctx.attendanceRequired)}`,
  ),
});

export const buildCancelledCopy = (params: {
  ctx: Pick<ReservationPushContext, 'ref' | 'serviceNames'>;
  title: string;
  reason: string;
}): { title: string; body: string } => ({
  title: params.title,
  body: capPushBody(
    `Rezervacija ${params.ctx.ref} (${formatServiceList(params.ctx.serviceNames)}): ${params.reason}`,
  ),
});

export const buildDailyLogReminderCopy = (
  ctx: Pick<ReservationPushContext, 'ref'>,
): { title: string; body: string } => ({
  title: 'Dnevna knjiga',
  body: capPushBody(
    `Rezervacija ${ctx.ref} čeka naplatu ili odluku u dnevnoj knjizi.`,
  ),
});

export const buildDelayWarningCopy = (
  ctx: Pick<ReservationPushContext, 'ref'>,
): { title: string; body: string } => ({
  title: 'Moguće kašnjenje',
  body: capPushBody(
    `Rezervacija ${ctx.ref}: današnji termini mogu kasniti. Obavijestit ćemo vas o tačnom vremenu.`,
  ),
});

export const buildReceiptCopy = (params: {
  ref: string;
  amount: number;
}): { title: string; body: string } => ({
  title: 'Potvrda uplate',
  body: capPushBody(
    `Uplata od ${params.amount.toFixed(2)} KM je evidentirana (${params.ref}).`,
  ),
});

export const buildDebtCopy = (params: {
  ref?: string;
  amount: number;
}): { title: string; body: string } => ({
  title: 'Novo dugovanje',
  body: capPushBody(
    params.ref
      ? `Evidentirano je dugovanje od ${params.amount.toFixed(2)} KM (${params.ref}).`
      : `Evidentirano je dugovanje od ${params.amount.toFixed(2)} KM.`,
  ),
});
