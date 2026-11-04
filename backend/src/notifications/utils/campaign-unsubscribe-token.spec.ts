import {
  createCampaignUnsubscribeToken,
  verifyCampaignUnsubscribeToken,
} from './campaign-unsubscribe-token';

describe('campaign unsubscribe token', () => {
  const consentedAt = new Date('2026-11-04T12:00:00.000Z');
  const payload = {
    consentId: 'f9b53da9-9bf3-4d02-a03e-18fd97ee8c10',
    consentedAt,
  };
  const secret = 'unit-test-only-secret-with-at-least-32-bytes';

  it('round trips a consent ID and consent timestamp without exposing them as plaintext', () => {
    const token = createCampaignUnsubscribeToken(payload, secret);

    expect(token).not.toContain(payload.consentId);
    expect(verifyCampaignUnsubscribeToken(token, secret)).toEqual(payload);
  });

  it('rejects tampered payloads, signatures, and a different signing key', () => {
    const token = createCampaignUnsubscribeToken(payload, secret);
    const [encodedPayload, signature] = token.split('.');

    expect(
      verifyCampaignUnsubscribeToken(`${encodedPayload}A.${signature}`, secret),
    ).toBeNull();
    expect(
      verifyCampaignUnsubscribeToken(
        `${encodedPayload}.${signature.slice(0, -1)}A`,
        secret,
      ),
    ).toBeNull();
    expect(verifyCampaignUnsubscribeToken(token, `${secret}-other`)).toBeNull();
  });

  it.each(['', 'not-a-token', 'a.b.c', '***.***', 'x'.repeat(513)])(
    'rejects malformed token %s',
    (token) => {
      expect(verifyCampaignUnsubscribeToken(token, secret)).toBeNull();
    },
  );
});
