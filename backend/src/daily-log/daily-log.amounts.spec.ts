import { getServiceAmount } from './daily-log.amounts';

describe('getServiceAmount', () => {
  it('servis 60 + tip 10 od naplacenih 70 = 60', () => {
    expect(getServiceAmount(70, 10)).toBe(60);
  });

  it('bez napojnice vraca cijeli iznos', () => {
    expect(getServiceAmount(54, 0)).toBe(54);
  });

  it('djelimicna naplata (dug) bez tipa', () => {
    expect(getServiceAmount(40, 0)).toBe(40);
  });

  it('clamp na 0 kad je tip veci od totala', () => {
    expect(getServiceAmount(5, 10)).toBe(0);
  });

  it('nullish / invalid vrijednosti', () => {
    expect(getServiceAmount(null, null)).toBe(0);
    expect(getServiceAmount(undefined, 5)).toBe(0);
  });
});
