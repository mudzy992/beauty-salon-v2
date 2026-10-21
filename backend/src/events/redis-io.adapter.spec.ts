import { EventEmitter } from 'node:events';
import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { RedisIoAdapter } from './redis-io.adapter';

jest.mock('redis', () => ({ createClient: jest.fn() }));
jest.mock('@socket.io/redis-adapter', () => ({ createAdapter: jest.fn() }));

type MockRedisClient = EventEmitter & {
  isOpen: boolean;
  duplicate: () => MockRedisClient;
  connect: () => Promise<void>;
  close: () => Promise<void>;
  destroy: () => void;
};
type ReadinessMiddleware = (
  socket: unknown,
  next: (error?: Error) => void,
) => void;

describe('RedisIoAdapter', () => {
  let publisher: MockRedisClient;
  let subscriber: MockRedisClient;
  let mockServer: {
    adapter: jest.Mock;
    use: jest.Mock;
    local: { disconnectSockets: jest.Mock };
  };
  let readinessMiddleware: ReadinessMiddleware | undefined;
  let adapterConstructor: jest.Mock;
  let createServerSpy: jest.SpyInstance;

  const makeClient = (): MockRedisClient => {
    const client = new EventEmitter() as MockRedisClient;
    client.isOpen = false;
    client.duplicate = jest.fn();
    client.connect = jest.fn(() => {
      client.isOpen = true;
      client.emit('ready');
      return Promise.resolve();
    });
    client.close = jest.fn(() => {
      client.isOpen = false;
      client.emit('end');
      return Promise.resolve();
    });
    client.destroy = jest.fn(() => {
      client.isOpen = false;
      client.emit('end');
    });
    return client;
  };

  const makeAdapter = () =>
    new RedisIoAdapter(
      { getHttpServer: jest.fn() } as unknown as INestApplicationContext,
      'rediss://redis.example:6379',
    );

  beforeEach(() => {
    jest.clearAllMocks();
    publisher = makeClient();
    subscriber = makeClient();
    publisher.duplicate = jest.fn(() => subscriber);
    (createClient as jest.Mock).mockReturnValue(publisher);
    adapterConstructor = jest.fn();
    (createAdapter as jest.Mock).mockReturnValue(adapterConstructor);
    readinessMiddleware = undefined;
    mockServer = {
      adapter: jest.fn(),
      use: jest.fn((middleware: ReadinessMiddleware) => {
        readinessMiddleware = middleware;
      }),
      local: { disconnectSockets: jest.fn() },
    };
    createServerSpy = jest
      .spyOn(IoAdapter.prototype, 'createIOServer')
      .mockReturnValue(mockServer);
  });

  afterEach(() => {
    createServerSpy.mockRestore();
  });

  it('attaches the Redis adapter and fails closed during Redis reconnects', async () => {
    const adapter = makeAdapter();
    await adapter.connectToRedis();
    const server = adapter.createIOServer(0);

    expect(createClient).toHaveBeenCalledWith({
      url: 'rediss://redis.example:6379',
      socket: { connectTimeout: 5_000 },
    });
    expect(publisher.connect).toHaveBeenCalledTimes(1);
    expect(subscriber.connect).toHaveBeenCalledTimes(1);
    expect(server).toBe(mockServer);
    expect(mockServer.adapter).toHaveBeenCalledWith(adapterConstructor);
    expect(readinessMiddleware).toBeDefined();

    const readinessResults: Array<Error | undefined> = [];
    readinessMiddleware?.({}, (error) => readinessResults.push(error));
    expect(readinessResults).toEqual([undefined]);

    subscriber.emit('reconnecting');
    expect(mockServer.local.disconnectSockets).toHaveBeenCalledWith(true);
    readinessMiddleware?.({}, (error) => readinessResults.push(error));
    expect(readinessResults[1]?.message).toBe(
      'Socket.IO shared adapter unavailable.',
    );

    subscriber.emit('ready');
    readinessMiddleware?.({}, (error) => readinessResults.push(error));
    expect(readinessResults[2]).toBeUndefined();

    await adapter.dispose();
    expect(subscriber.close).toHaveBeenCalledTimes(1);
    expect(publisher.close).toHaveBeenCalledTimes(1);
  });

  it('destroys Redis clients and does not expose connection details on startup failure', async () => {
    publisher.connect = jest.fn(() => {
      publisher.isOpen = true;
      return Promise.reject(new Error('redis://secret-host:secret-port'));
    });

    const adapter = makeAdapter();
    await expect(adapter.connectToRedis()).rejects.toThrow(
      'Socket.IO Redis adapter initial connection failed.',
    );
    expect(publisher.destroy).toHaveBeenCalledTimes(1);
    expect(subscriber.destroy).toHaveBeenCalledTimes(1);
    expect(createAdapter).not.toHaveBeenCalled();
  });
});
