import { createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_DOMAIN = 'campaign-email-unsubscribe:v1';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CampaignUnsubscribeTokenPayload {
  consentId: string;
  consentedAt: Date;
}

function signingKey(secret: string): Buffer {
  return createHmac('sha256', secret).update(TOKEN_DOMAIN).digest();
}

export function createCampaignUnsubscribeToken(
  payload: CampaignUnsubscribeTokenPayload,
  secret: string,
): string {
  const encodedPayload = Buffer.from(
    `${payload.consentId}|${payload.consentedAt.getTime()}`,
    'utf8',
  ).toString('base64url');
  const signature = createHmac('sha256', signingKey(secret))
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifyCampaignUnsubscribeToken(
  token: string,
  secret: string,
): CampaignUnsubscribeTokenPayload | null {
  if (typeof token !== 'string' || token.length > 512) return null;
  const parts = token.split('.');
  if (
    parts.length !== 2 ||
    parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))
  ) {
    return null;
  }

  const [encodedPayload, encodedSignature] = parts;
  const suppliedSignature = Buffer.from(encodedSignature, 'base64url');
  const expectedSignature = createHmac('sha256', signingKey(secret))
    .update(encodedPayload)
    .digest();
  if (
    suppliedSignature.toString('base64url') !== encodedSignature ||
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return null;
  }

  const payloadBytes = Buffer.from(encodedPayload, 'base64url');
  if (payloadBytes.toString('base64url') !== encodedPayload) return null;
  const [consentId, timestamp, ...extra] = payloadBytes
    .toString('utf8')
    .split('|');
  if (
    extra.length !== 0 ||
    !UUID_PATTERN.test(consentId || '') ||
    !/^\d{1,16}$/.test(timestamp || '')
  ) {
    return null;
  }

  const consentedAtMs = Number(timestamp);
  if (!Number.isSafeInteger(consentedAtMs) || consentedAtMs <= 0) return null;
  const consentedAt = new Date(consentedAtMs);
  if (Number.isNaN(consentedAt.getTime())) return null;
  return { consentId, consentedAt };
}
