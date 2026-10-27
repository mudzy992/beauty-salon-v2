import {
  HttpException,
  HttpStatus,
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { HttpRateLimitStore } from './http-rate-limit.store';
import {
  HTTP_RATE_LIMIT_METADATA,
  type HttpRateLimitPolicy,
} from './http-rate-limit.decorator';

interface AuthenticatedRequest extends Request {
  user?: { sub?: string; id?: string };
}

@Injectable()
export class HttpRateLimitInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly store: HttpRateLimitStore,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const configuredPolicies = this.reflector.getAllAndOverride<
      HttpRateLimitPolicy | readonly HttpRateLimitPolicy[]
    >(HTTP_RATE_LIMIT_METADATA, [context.getHandler(), context.getClass()]);
    if (!configuredPolicies || context.getType() !== 'http') {
      return next.handle();
    }

    const policies: readonly HttpRateLimitPolicy[] = Array.isArray(
      configuredPolicies,
    )
      ? (configuredPolicies as readonly HttpRateLimitPolicy[])
      : [configuredPolicies as HttpRateLimitPolicy];
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    let tightest: {
      policy: HttpRateLimitPolicy;
      ttlSeconds: number;
      remaining: number;
    } | null = null;

    for (const policy of policies) {
      const identity = this.getIdentity(policy, request);
      if (!identity) continue;

      const counter = await this.store.incrementWindow(
        policy.bucket,
        identity,
        policy.windowSeconds,
      );
      if (!counter) continue;

      const remaining = Math.max(0, policy.limit - counter.count);
      if (
        !tightest ||
        remaining / policy.limit < tightest.remaining / tightest.policy.limit
      ) {
        tightest = {
          policy,
          ttlSeconds: counter.ttlSeconds,
          remaining,
        };
      }

      if (counter.count <= policy.limit) continue;

      this.setRateLimitHeaders(
        response,
        policy,
        remaining,
        counter.ttlSeconds,
      );
      const retryAfter = Math.max(1, counter.ttlSeconds);
      response.setHeader('Retry-After', String(retryAfter));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Previše zahtjeva. Pokušajte ponovo nakon isteka limita.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (tightest) {
      this.setRateLimitHeaders(
        response,
        tightest.policy,
        tightest.remaining,
        tightest.ttlSeconds,
      );
    }
    return next.handle();
  }

  private setRateLimitHeaders(
    response: Response,
    policy: HttpRateLimitPolicy,
    remaining: number,
    ttlSeconds: number,
  ): void {
    response.setHeader('RateLimit-Limit', String(policy.limit));
    response.setHeader('RateLimit-Remaining', String(remaining));
    response.setHeader('RateLimit-Reset', String(ttlSeconds));
    response.setHeader(
      'RateLimit-Policy',
      `${policy.limit};w=${policy.windowSeconds}`,
    );
  }

  private getIdentity(
    policy: HttpRateLimitPolicy,
    request: AuthenticatedRequest,
  ): string | null {
    if (policy.identity === 'user') {
      const userId = request.user?.sub ?? request.user?.id;
      return userId ? `user:${userId}` : null;
    }
    if (policy.identity === 'account') {
      if (!policy.accountField) return null;
      const body = request.body as Record<string, unknown> | undefined;
      const value = body?.[policy.accountField];
      if (typeof value !== 'string') return null;
      const normalized = value.trim().normalize('NFKC').toLowerCase();
      return normalized ? `account:${normalized.slice(0, 254)}` : null;
    }
    return request.ip ? `ip:${request.ip}` : null;
  }
}
