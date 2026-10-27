import { StreamableFile } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { DecimalToNumberInterceptor } from './decimal-to-number.interceptor';

describe('DecimalToNumberInterceptor', () => {
  const interceptor = new DecimalToNumberInterceptor();
  const context = {} as ExecutionContext;

  it('preserves StreamableFile instances for the HTTP adapter', async () => {
    const bytes = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    const file = new StreamableFile(bytes);
    const next = { handle: () => of(file) } as CallHandler;

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toBe(file);
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('leaves Buffer payloads intact', async () => {
    const bytes = Buffer.from([0x52, 0x49, 0x46, 0x46]);
    const next = { handle: () => of(bytes) } as CallHandler;

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toBe(bytes);
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});
