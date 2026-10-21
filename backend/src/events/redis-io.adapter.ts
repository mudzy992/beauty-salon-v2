import { Logger, type INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, type RedisClientType } from 'redis';
import type { Server, ServerOptions } from 'socket.io';

const REDIS_CONNECT_TIMEOUT_MS = 15_000;

type RedisClient = RedisClientType;
type RedisClientName = 'publisher' | 'subscriber';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private publisher?: RedisClient;
  private subscriber?: RedisClient;
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private readonly servers = new Set<Server>();
  private publisherReady = false;
  private subscriberReady = false;
  private redisReady = false;

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl: string,
    private readonly channelPrefix: string,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    try {
      const publisher = createClient({
        url: this.redisUrl,
        socket: { connectTimeout: 5_000 },
      });
      const subscriber = publisher.duplicate();
      this.publisher = publisher;
      this.subscriber = subscriber;
      this.listenForClientState(publisher, 'publisher');
      this.listenForClientState(subscriber, 'subscriber');

      let startupTimeout: NodeJS.Timeout | undefined;
      try {
        await Promise.race([
          Promise.all([publisher.connect(), subscriber.connect()]),
          new Promise<never>((_, reject) => {
            startupTimeout = setTimeout(
              () => reject(new Error('Redis connection timed out')),
              REDIS_CONNECT_TIMEOUT_MS,
            );
          }),
        ]);
      } finally {
        if (startupTimeout) clearTimeout(startupTimeout);
      }

      this.setClientReady('publisher', true);
      this.setClientReady('subscriber', true);
      this.adapterConstructor = createAdapter(publisher, subscriber, {
        key: this.channelPrefix,
      });
    } catch {
      this.destroyRedisClients();
      throw new Error('Socket.IO Redis adapter initial connection failed.');
    }
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    if (!this.adapterConstructor) {
      throw new Error('Socket.IO Redis adapter is not initialized.');
    }

    const server = super.createIOServer(port, options) as Server;
    server.adapter(this.adapterConstructor);
    server.use((_socket, next) => {
      if (!this.redisReady) {
        next(new Error('Socket.IO shared adapter unavailable.'));
        return;
      }
      next();
    });
    this.servers.add(server);
    return server;
  }

  override async dispose(): Promise<void> {
    await super.dispose();
    await this.closeRedisClients();
    this.servers.clear();
  }

  private listenForClientState(client: RedisClient, name: RedisClientName) {
    client.on('error', () => {
      this.logger.error('Socket.IO Redis adapter client error.');
    });
    client.on('ready', () => this.setClientReady(name, true));
    client.on('reconnecting', () => this.setClientReady(name, false));
    client.on('end', () => this.setClientReady(name, false));
  }

  private setClientReady(name: RedisClientName, ready: boolean) {
    if (name === 'publisher') {
      this.publisherReady = ready;
    } else {
      this.subscriberReady = ready;
    }

    const wasReady = this.redisReady;
    this.redisReady = this.publisherReady && this.subscriberReady;
    if (wasReady && !this.redisReady) {
      this.logger.warn(
        'Socket.IO Redis adapter unavailable; disconnecting local sessions.',
      );
      for (const server of this.servers) {
        server.local.disconnectSockets(true);
      }
    }
  }

  private destroyRedisClients() {
    this.publisher?.destroy();
    this.subscriber?.destroy();
    this.publisherReady = false;
    this.subscriberReady = false;
    this.redisReady = false;
  }

  private async closeRedisClients(): Promise<void> {
    const openClients = [this.subscriber, this.publisher].filter(
      (client): client is RedisClient => Boolean(client?.isOpen),
    );
    await Promise.allSettled(openClients.map((client) => client.close()));
  }
}
