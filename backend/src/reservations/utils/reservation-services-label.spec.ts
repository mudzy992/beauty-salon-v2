import { formatReservationServicesLabel } from './reservation-services-label';

describe('formatReservationServicesLabel', () => {
  it('returns fallback when no items', () => {
    expect(
      formatReservationServicesLabel({ fallbackServiceName: 'Šišanje' }),
    ).toBe('Šišanje');
  });

  it('returns single item name', () => {
    expect(
      formatReservationServicesLabel({
        items: [{ service: { name: 'Farbanje' } }],
      }),
    ).toBe('Farbanje');
  });

  it('returns compact multi-service label', () => {
    expect(
      formatReservationServicesLabel({
        items: [
          { service: { name: 'Farbanje' } },
          { service: { name: 'Pranje' } },
        ],
      }),
    ).toBe('Farbanje + 1');
  });
});
