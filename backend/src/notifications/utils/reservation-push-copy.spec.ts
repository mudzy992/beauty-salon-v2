import {
  buildTimeChangedCopy,
  capPushBody,
  formatPushDate,
  formatServiceList,
} from './reservation-push-copy';

describe('reservation-push-copy', () => {
  const base = {
    ref: 'RZ-100',
    serviceNames: ['Šišanje'],
    date: '2026-08-20',
    startTime: '09:00:00',
    endTime: '10:30',
    attendanceRequired: true,
  };

  it('formatira datum i usluge', () => {
    expect(formatPushDate('2026-08-20')).toBe('20.08.2026.');
    expect(formatServiceList(['A'])).toBe('A');
    expect(formatServiceList(['A', 'B', 'C', 'D'])).toBe('A, B, C i još 1');
  });

  it('time-changed traži potvrdu dolaska kad je CLIENT_REQUIRED', () => {
    const copy = buildTimeChangedCopy(base);
    expect(copy.title).toBe('Termin pomjeren');
    expect(copy.body).toContain('RZ-100');
    expect(copy.body).toContain('Šišanje');
    expect(copy.body).toContain('20.08.2026.');
    expect(copy.body).toContain('09:00 do 10:30');
    expect(copy.body).toContain('Molimo da potvrdite dolazak');
  });

  it('time-changed bez potvrde dolaska', () => {
    const copy = buildTimeChangedCopy({ ...base, attendanceRequired: false });
    expect(copy.body).toContain('Potvrda dolaska nije potrebna');
  });

  it('capPushBody skraćuje predugačak tekst', () => {
    const long = 'x'.repeat(300);
    const capped = capPushBody(long, 50);
    expect(capped.length).toBeLessThanOrEqual(50);
    expect(capped.endsWith('…')).toBe(true);
  });
});
