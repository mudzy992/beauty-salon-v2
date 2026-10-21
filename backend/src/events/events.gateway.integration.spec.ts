import type { Server as HttpServer } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import { EventsGateway } from './events.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { SOCKET_EVENTS } from './socket-events';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const JWT_SECRET = 'socket-integration-test-secret';
const EVENT_TIMEOUT_MS = 2_000;
const EVENT_ABSENCE_WINDOW_MS = 500;

type SocketUserRecord = {
  isActive: boolean;
  userRoles: { role: { name: string } }[];
};

describe('EventsGateway live Socket.IO integration', () => {
  let app: INestApplication;
  let gateway: EventsGateway;
  let jwtService: JwtService;
  let url: string;
  const clients: Socket[] = [];
  const currentUsers = new Map<string, SocketUserRecord>([
    ['client-1', { isActive: true, userRoles: [{ role: { name: 'CLIENT' } }] }],
    [
      'stylist-1',
      { isActive: true, userRoles: [{ role: { name: 'STYLIST' } }] },
    ],
    [
      'admin-1',
      { isActive: true, userRoles: [{ role: { name: 'SYSTEM_ADMIN' } }] },
    ],
    ['owner-1', { isActive: true, userRoles: [{ role: { name: 'OWNER' } }] }],
    [
      'inactive-1',
      { isActive: false, userRoles: [{ role: { name: 'SYSTEM_ADMIN' } }] },
    ],
  ]);
  const mockPrisma = {
    user: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(currentUsers.get(where.id) ?? null),
      ),
    },
  };

  const connectWithAuth = async (
    auth: Record<string, unknown>,
  ): Promise<Socket> => {
    const socket = io(url, {
      auth,
      transports: ['websocket'],
      reconnection: false,
      timeout: EVENT_TIMEOUT_MS,
    });
    clients.push(socket);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timed out waiting for Socket.IO connection')),
        EVENT_TIMEOUT_MS,
      );
      socket.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    return socket;
  };

  const connectSocket = async (
    userId?: string,
    tokenRoles: string[] = [],
  ): Promise<Socket> =>
    connectWithAuth(
      userId
        ? { token: jwtService.sign({ sub: userId, roles: tokenRoles }) }
        : {},
    );

  const waitForEvent = (socket: Socket, event: string): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          reject(new Error(`Timed out waiting for Socket.IO event: ${event}`)),
        EVENT_TIMEOUT_MS,
      );
      socket.once(event, (payload: unknown) => {
        clearTimeout(timeout);
        resolve(payload);
      });
    });

  const hasNotReceivedEvent = (
    socket: Socket,
    event: string,
  ): Promise<boolean> =>
    new Promise((resolve) => {
      const onEvent = () => {
        clearTimeout(timeout);
        resolve(false);
      };
      const timeout = setTimeout(() => {
        socket.off(event, onEvent);
        resolve(true);
      }, EVENT_ABSENCE_WINDOW_MS);
      socket.once(event, onEvent);
    });

  const roomMemberIds = async (room: string): Promise<string[]> =>
    (await gateway.server.in(room).fetchSockets())
      .map((socket) => socket.id)
      .sort();

  const waitForRoomMembers = async (
    room: string,
    expectedIds: string[],
  ): Promise<void> => {
    const expected = [...expectedIds].sort();
    const deadline = Date.now() + EVENT_TIMEOUT_MS;

    while (Date.now() < deadline) {
      if (
        JSON.stringify(await roomMemberIds(room)) === JSON.stringify(expected)
      ) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    throw new Error(`Unexpected members in Socket.IO room ${room}`);
  };

  beforeAll(async () => {
    jwtService = new JwtService({ secret: JWT_SECRET });
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventsGateway,
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(JWT_SECRET) },
        },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');
    const server = app.getHttpServer() as HttpServer;
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP address for the Socket.IO test server');
    }
    url = `http://127.0.0.1:${address.port}`;
    gateway = app.get(EventsGateway);
  });

  afterAll(async () => {
    for (const client of clients) client.disconnect();
    await app?.close();
  });

  it('uses current DB roles and routes safe invalidations to the intended rooms', async () => {
    const anonymous = await connectSocket();
    const client = await connectSocket('client-1', ['SYSTEM_ADMIN']);
    const stylist = await connectSocket('stylist-1', ['CLIENT']);
    const admin = await connectSocket('admin-1', ['CLIENT']);
    const owner = await connectSocket('owner-1', ['CLIENT']);

    await waitForRoomMembers('public', [anonymous.id]);
    await waitForRoomMembers('user:client-1', [client.id]);
    await waitForRoomMembers('stylists', [stylist.id]);
    await waitForRoomMembers('admin', [admin.id, owner.id]);

    const connectedClients = [anonymous, client, stylist, admin, owner];
    const salonInvalidations = connectedClients.map((socket) =>
      waitForEvent(socket, SOCKET_EVENTS.SALON_UPDATED),
    );
    gateway.emitToAll(SOCKET_EVENTS.SALON_UPDATED, { key: 'salon' });
    await expect(Promise.all(salonInvalidations)).resolves.toEqual(
      connectedClients.map(() => ({ key: 'salon' })),
    );

    const publicSettingEvents = connectedClients.map((socket) =>
      waitForEvent(socket, SOCKET_EVENTS.SETTINGS_UPDATED),
    );
    gateway.emitToAll(SOCKET_EVENTS.SETTINGS_UPDATED, {
      key: 'app_title',
      value: 'Salon',
    });
    await expect(Promise.all(publicSettingEvents)).resolves.toEqual(
      connectedClients.map(() => ({ key: 'app_title', value: 'Salon' })),
    );

    const privateSettingEvents = [admin, owner].map((socket) =>
      waitForEvent(socket, SOCKET_EVENTS.SETTINGS_UPDATED),
    );
    const privateSettingNonRecipients = [anonymous, client, stylist].map(
      (socket) => hasNotReceivedEvent(socket, SOCKET_EVENTS.SETTINGS_UPDATED),
    );
    gateway.emitToAdmins(SOCKET_EVENTS.SETTINGS_UPDATED, {
      key: 'system_email_host',
    });
    await expect(Promise.all(privateSettingEvents)).resolves.toEqual([
      { key: 'system_email_host' },
      { key: 'system_email_host' },
    ]);
    await expect(Promise.all(privateSettingNonRecipients)).resolves.toEqual([
      true,
      true,
      true,
    ]);

    expect(await roomMemberIds('admin')).toEqual([admin.id, owner.id].sort());

    await expect(connectSocket('inactive-1', ['SYSTEM_ADMIN'])).rejects.toThrow(
      'Unauthorized',
    );
    await expect(
      connectSocket('missing-user', ['SYSTEM_ADMIN']),
    ).rejects.toThrow('Unauthorized');
    await expect(connectWithAuth({ token: 'not-a-valid-jwt' })).rejects.toThrow(
      'Unauthorized',
    );
  });
});
