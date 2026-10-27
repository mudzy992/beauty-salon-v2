import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Prisma's `Decimal` fields (price, tipAmount, actualPrice,
 * loyaltyDiscountAmount, ...) implement `toJSON()` and serialize as
 * STRINGS (e.g. "45.00"), not JSON numbers. This is Prisma/decimal.js
 * behaviour to avoid silent precision loss, and it applies regardless of
 * the underlying database provider (MySQL or PostgreSQL) — it is not
 * something the Postgres migration changed, but it is a real mismatch
 * against the frontend/mobile TypeScript types, which declare these
 * fields as `number`.
 *
 * All the amounts in this schema use `@db.Decimal(10, 2)`, well within
 * `Number.MAX_SAFE_INTEGER`, so converting to a plain JS number here is
 * safe and loses no precision in practice.
 *
 * This interceptor walks every JSON response and converts `Decimal`
 * instances to plain numbers, so the wire format actually matches what
 * the frontend/mobile clients expect.
 */
function convertDecimals<T>(value: T): T {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber() as unknown as T;
  }
  // Preserve binary responses; flattening StreamableFile loses Nest's adapter hook.
  if (value instanceof StreamableFile || Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => convertDecimals(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = convertDecimals(val);
    }
    return result as T;
  }
  return value;
}

@Injectable()
export class DecimalToNumberInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((data) => convertDecimals(data)));
  }
}
