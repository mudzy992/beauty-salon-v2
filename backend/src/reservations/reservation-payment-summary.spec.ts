import { mapReservationPaymentSummary } from './reservation-payment-summary';

describe('mapReservationPaymentSummary', () => {
  it('vraća null bez completedAt', () => {
    expect(
      mapReservationPaymentSummary({
        publicReferenceCode: 'DK-1',
        actualPrice: 50,
        tipAmount: 0,
        loyaltyDiscountAmount: 0,
        completedAt: null,
        items: [{ unitPrice: 50, service: { name: 'Usluga' } }],
      }),
    ).toBeNull();
  });

  it('mapira client-safe payment summary', () => {
    const summary = mapReservationPaymentSummary({
      publicReferenceCode: 'DK-1',
      actualPrice: 70,
      tipAmount: 10,
      loyaltyDiscountAmount: 5,
      completedAt: new Date('2026-08-12T10:00:00Z'),
      items: [
        { unitPrice: 60, service: { name: 'Šišanje' } },
        { unitPrice: 15, service: { name: 'Pranje' } },
      ],
    });
    expect(summary).toEqual({
      publicReferenceCode: 'DK-1',
      actualPrice: 70,
      tipAmount: 10,
      serviceAmount: 60,
      completedAt: '2026-08-12T10:00:00.000Z',
      loyaltyDiscountAmount: 5,
      items: [
        { name: 'Šišanje', unitPrice: 60 },
        { name: 'Pranje', unitPrice: 15 },
      ],
    });
  });
});
