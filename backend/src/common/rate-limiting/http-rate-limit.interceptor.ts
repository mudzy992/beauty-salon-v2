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
    const policy = this.reflector.getAllAndOverride<HttpRateLimitPolicy>(
      HTTP_RATE_LIMIT_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!policy || context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const identity = this.getIdentity(policy, request);
    if (!identity) return next.handle();

    const counter = await this.store.incrementWindow(
      policy.bucket,
      identity,
      policy.windowSeconds,
    );
    if (!counter) return next.handle();

    const remaining = Math.max(0, policy.limit - counter.count);
    response.setHeader('RateLimit-Limit', String(policy.limit));
    response.setHeader('RateLimit-Remaining', String(remaining));
    response.setHeader('RateLimit-Reset', String(counter.ttlSeconds));
    response.setHeader(
      'RateLimit-Policy',
      `${policy.limit};w=${policy.windowSeconds}`,
    );

    if (counter.count <= policy.limit) return next.handle();

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

  private getIdentity(
    policy: HttpRateLimitPolicy,
    request: AuthenticatedRequest,
  ): string | null {
    if (policy.identity === 'user') {
      const userId = request.user?.sub ?? request.user?.id;
      return userId ? `user:${userId}` : null;
    }
    return request.ip ? `ip:${request.ip}` : null;
  }
}
