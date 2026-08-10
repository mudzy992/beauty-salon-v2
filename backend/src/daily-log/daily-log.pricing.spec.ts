import {
  computeDebtPaymentTip,
  computeTipAndShortfall,
  resolveServiceItems,
  sumUnitPrices,
} from './daily-log.pricing';

describe('daily-log.pricing', () => {
  it('uses editable unit prices (e.g. farbanje 30→40)', () => {
    const catalog = new Map([
      ['cut', 10],
      ['color', 30],
    ]);
    const items = resolveServiceItems({
      items: [
        { serviceId: 'cut', unitPrice: 10 },
        { serviceId: 'color', unitPrice: 40 },
      ],
      catalogPrices: catalog,
    });
    expect(sumUnitPrices(items)).toBe(50);
  });

  it('computes tip when paid > chargeBase', () => {
    expect(computeTipAndShortfall(60, 50)).toEqual({ tipAmount: 10, shortfall: 0 });
  });

  it('computes shortfall when paid < chargeBase', () => {
    expect(computeTipAndShortfall(40, 50)).toEqual({ tipAmount: 0, shortfall: 10 });
  });

  it('computes debt payment tip vs list price', () => {
    expect(computeDebtPaymentTip(40, 30)).toBe(10);
    expect(computeDebtPaymentTip(20, 30)).toBe(0);
  });

  it('falls back to catalog prices when items omitted', () => {
    const catalog = new Map([
      ['a', 10],
      ['b', 20],
    ]);
    const items = resolveServiceItems({
      serviceIds: ['a', 'b'],
      catalogPrices: catalog,
    });
    expect(sumUnitPrices(items)).toBe(30);
  });
});
