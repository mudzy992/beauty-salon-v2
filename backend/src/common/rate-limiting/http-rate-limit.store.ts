import { createHash } from 'node:crypto';
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

const WINDOW_COUNTER_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { count, ttl }
`;

export interface HttpRateLimitCounter {
  count: number;
  ttlSeconds: number;
}

@Injectable()
export class HttpRateLimitStore implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HttpRateLimitStore.name);
  private readonly redisUrl?: string;
  private readonly keyPrefix: string;
  private client?: RedisClientType;
  private warnedUnavailable = false;

  constructor(config: ConfigService) {
    const environment = config.get<string>('NODE_ENV')?.trim() || 'development';
    const configuredPrefix = config
      .get<string>('HTTP_RATE_LIMIT_PREFIX')
      ?.trim();
    this.keyPrefix = this.normalizePrefix(
      configuredPrefix || `beauty-salon-v2:http-rate-limit:${environment}`,
    );
    this.redisUrl = config.get<string>('HTTP_RATE_LIMIT_REDIS_URL')?.trim();
  }

  onModuleInit(): void {
    if (!this.redisUrl) {
      this.warnUnavailable('HTTP_RATE_LIMIT_REDIS_URL is not configured');
      return;
    }

    try {
      const client = createClient({
        url: this.redisUrl,
        socket: {
          connectTimeout: 5_000,
          reconnectStrategy: (retries) => Math.min(retries * 1_000, 5_000),
        },
      });
      this.client = client;
      client.on('error', () =>
        this.warnUnavailable('Redis client reported an error'),
      );
      client.on('end', () => this.warnUnavailable('Redis connection ended'));
      client.on('ready', () => {
        this.warnedUnavailable = false;
        this.logger.log('HTTP rate-limit Redis store is ready.');
      });
      void client.connect().catch(() => {
        this.warnUnavailable('Redis connection could not be established');
      });
    } catch {
      this.warnUnavailable('Redis client could not be initialized');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.close().catch(() => undefined);
    }
    this.client = undefined;
  }

  async incrementWindow(
    bucket: string,
    identity: string,
    windowSeconds: number,
  ): Promise<HttpRateLimitCounter | null> {
    const client = this.client;
    if (!client?.isReady) return null;

    try {
      const key = this.createKey(bucket, identity);
      const result: unknown = await client.eval(WINDOW_COUNTER_SCRIPT, {
        keys: [key],
        arguments: [String(windowSeconds)],
      });
      if (!Array.isArray(result) || result.length !== 2) {
        throw new Error('Invalid HTTP rate-limit counter response');
      }
      const count = Number(result[0]);
      const ttlSeconds = Number(result[1]);
      if (!Number.isSafeInteger(count) || !Number.isFinite(ttlSeconds)) {
        throw new Error('Invalid HTTP rate-limit counter values');
      }
      return { count, ttlSeconds: Math.max(0, ttlSeconds) };
    } catch {
      this.warnUnavailable('Redis rate-limit command failed');
      return null;
    }
  }

  private createKey(bucket: string, identity: string): string {
    const safeBucket = bucket.replace(/[^a-zA-Z0-9:._-]/g, '_');
    const identityHash = createHash('sha256').update(identity).digest('hex');
    return `${this.keyPrefix}:${safeBucket}:${identityHash}`;
  }

  private normalizePrefix(value: string): string {
    return value.replace(/[^a-zA-Z0-9:._-]/g, '_').replace(/:+$/g, '');
  }

  private warnUnavailable(reason: string): void {
    if (this.warnedUnavailable) return;
    this.warnedUnavailable = true;
    this.logger.warn(
      `HTTP rate limiting is failing open because its dedicated Redis store is unavailable: ${reason}.`,
    );
  }
}
