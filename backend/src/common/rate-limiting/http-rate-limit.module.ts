import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpRateLimitInterceptor } from './http-rate-limit.interceptor';
import { HttpRateLimitStore } from './http-rate-limit.store';

@Global()
@Module({
  providers: [
    HttpRateLimitStore,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpRateLimitInterceptor,
    },
  ],
  exports: [HttpRateLimitStore],
})
export class HttpRateLimitModule {}
