import { SetMetadata } from '@nestjs/common';

export const HTTP_RATE_LIMIT_METADATA = 'http-rate-limit-policy';

export type HttpRateLimitIdentity = 'ip' | 'user' | 'account';

export interface HttpRateLimitPolicy {
  bucket: string;
  limit: number;
  windowSeconds: number;
  identity: HttpRateLimitIdentity;
  accountField?: string;
}

export type HttpRateLimitPolicies =
  | HttpRateLimitPolicy
  | readonly HttpRateLimitPolicy[];

export const HttpRateLimit = (policies: HttpRateLimitPolicies) => {
  const normalized: readonly HttpRateLimitPolicy[] = Array.isArray(policies)
    ? (policies as readonly HttpRateLimitPolicy[])
    : [policies as HttpRateLimitPolicy];
  return SetMetadata(
    HTTP_RATE_LIMIT_METADATA,
    Object.freeze(normalized.map((policy) => Object.freeze({ ...policy }))),
  );
};
