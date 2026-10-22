import { SetMetadata } from '@nestjs/common';

export const HTTP_RATE_LIMIT_METADATA = 'http-rate-limit-policy';

export type HttpRateLimitIdentity = 'ip' | 'user';

export interface HttpRateLimitPolicy {
  bucket: string;
  limit: number;
  windowSeconds: number;
  identity: HttpRateLimitIdentity;
}

export const HttpRateLimit = (policy: HttpRateLimitPolicy) =>
  SetMetadata(HTTP_RATE_LIMIT_METADATA, Object.freeze({ ...policy }));
