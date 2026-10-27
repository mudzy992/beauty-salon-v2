import { getPasswordVersion, matchesPasswordVersion } from './password-version';

describe('password-version', () => {
  it('uses zero for accounts without a password-change timestamp', () => {
    expect(getPasswordVersion(null)).toBe(0);
    expect(matchesPasswordVersion(null, undefined)).toBe(true);
    expect(matchesPasswordVersion(undefined, 0)).toBe(true);
  });

  it('accepts only a token carrying the current millisecond version after a change', () => {
    const changedAt = new Date('2026-10-25T12:34:56.789Z');
    const currentVersion = changedAt.getTime();

    expect(getPasswordVersion(changedAt)).toBe(currentVersion);
    expect(matchesPasswordVersion(changedAt, currentVersion)).toBe(true);
    expect(matchesPasswordVersion(changedAt, undefined)).toBe(false);
    expect(matchesPasswordVersion(changedAt, currentVersion - 1)).toBe(false);
  });

  it.each(['0', null, NaN, Number.MAX_SAFE_INTEGER + 1])(
    'rejects malformed password version claim %p',
    (claim) => {
      expect(matchesPasswordVersion(null, claim)).toBe(false);
    },
  );

  it('fails closed for an invalid non-null timestamp', () => {
    const invalidDate = new Date(Number.NaN);
    expect(() => getPasswordVersion(invalidDate)).toThrow(
      'Invalid password change timestamp',
    );
    expect(matchesPasswordVersion(invalidDate, undefined)).toBe(false);
  });
});
