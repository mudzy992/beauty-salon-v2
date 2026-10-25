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
const EVENT_TIMEOUT_MS = 3_000;
const EVENT_ABSENCE_WINDOW_MS = 500;

type SocketUserRecord = {
  isActive: boolean;
  userRoles: { role: { name: string } }[];
  stylistProfile?: { isActive: boolean; status: 'PENDING' | 'ACTIVE' } | null;
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
      {
        isActive: true,
        userRoles: [{ role: { name: 'STYLIST' } }],
        stylistProfile: { isActive: true, status: 'ACTIVE' },
      },
    ],
    [
      'pending-stylist-1',
      {
        isActive: true,
        userRoles: [{ role: { name: 'STYLIST' } }],
        stylistProfile: { isActive: false, status: 'PENDING' },
      },
    ],
    [
      'revoked-stylist-1',
      {
        isActive: true,
        userRoles: [{ role: { name: 'STYLIST' } }],
        stylistProfile: { isActive: true, status: 'ACTIVE' },
      },
    ],
    [
      'expiring-1',
      { isActive: true, userRoles: [{ role: { name: 'CLIENT' } }] },
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
    expiresInSeconds = 3_600,
  ): Promise<Socket> =>
    connectWithAuth(
      userId
        ? {
            token: jwtService.sign(
              { sub: userId, roles: tokenRoles },
              { expiresIn: expiresInSeconds },
            ),
          }
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

  const waitForDisconnect = (socket: Socket): Promise<string> =>
    new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timed out waiting for socket disconnect')),
        EVENT_TIMEOUT_MS,
      );
      socket.once('disconnect', (reason) => {
        clearTimeout(timeout);
        resolve(reason);
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
    const pendingStylist = await connectSocket('pending-stylist-1', [
      'SYSTEM_ADMIN',
      'STYLIST',
    ]);
    const admin = await connectSocket('admin-1', ['CLIENT']);
    const owner = await connectSocket('owner-1', ['CLIENT']);

    await waitForRoomMembers('public', [anonymous.id]);
    await waitForRoomMembers('user:client-1', [client.id]);
    await waitForRoomMembers('user:pending-stylist-1', [pendingStylist.id]);
    await waitForRoomMembers('stylists', [stylist.id]);
    await waitForRoomMembers('admin', [admin.id, owner.id]);

    const connectedClients = [
      anonymous,
      client,
      stylist,
      pendingStylist,
      admin,
      owner,
    ];
    const salonInvalidations = connectedClients.map((socket) =>
      waitForEvent(socket, SOCKET_EVENTS.SALON_UPDATED),
    );
    gateway.emitToAll(SOCKET_EVENTS.SALON_UPDATED, {
      key: 'salon',
      holidayDetails: 'synthetic-private-value',
    });
    await expect(Promise.all(salonInvalidations)).resolves.toEqual(
      connectedClients.map(() => ({ key: 'salon' })),
    );

    const publicSettingEvents = connectedClients.map((socket) =>
      waitForEvent(socket, SOCKET_EVENTS.SETTINGS_UPDATED),
    );
    gateway.emitToAll(SOCKET_EVENTS.SETTINGS_UPDATED, {
      key: 'app_title',
      value: 'Salon',
      privateValue: 'synthetic-private-value',
    });
    await expect(Promise.all(publicSettingEvents)).resolves.toEqual(
      connectedClients.map(() => ({ key: 'app_title' })),
    );

    const availabilityEvents = connectedClients.map((socket) =>
      waitForEvent(socket, SOCKET_EVENTS.AVAILABILITY_CHANGED),
    );
    const availabilityUpdate = {
      serviceIds: ['public-service-1'],
      date: '2026-10-25',
    };
    gateway.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      ...availabilityUpdate,
      reservationId: 'reservation-private-1',
      clientEmail: 'private@example.test',
    });
    await expect(Promise.all(availabilityEvents)).resolves.toEqual(
      connectedClients.map(() => availabilityUpdate),
    );

    const directPublicAvailability = waitForEvent(
      anonymous,
      SOCKET_EVENTS.AVAILABILITY_CHANGED,
    );
    const authenticatedAvailabilityAbsence = connectedClients
      .slice(1)
      .map((socket) =>
        hasNotReceivedEvent(socket, SOCKET_EVENTS.AVAILABILITY_CHANGED),
      );
    gateway.emitToRoom('public', SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: 'public-service-2',
      date: '2026-10-26',
      reservationId: 'reservation-private-2',
      clientEmail: 'private@example.test',
    });
    await expect(directPublicAvailability).resolves.toEqual({
      serviceId: 'public-service-2',
      date: '2026-10-26',
    });
    await expect(
      Promise.all(authenticatedAvailabilityAbsence),
    ).resolves.toEqual(connectedClients.slice(1).map(() => true));

    const privateBroadcast = {
      reservationId: 'reservation-private-1',
      clientEmail: 'private@example.test',
    };
    const privateBroadcastAbsence = connectedClients.map((socket) =>
      hasNotReceivedEvent(socket, SOCKET_EVENTS.RESERVATION_CREATED),
    );
    gateway.emitToAll(SOCKET_EVENTS.RESERVATION_CREATED, privateBroadcast);
    await expect(Promise.all(privateBroadcastAbsence)).resolves.toEqual(
      connectedClients.map(() => true),
    );

    const privateRoomAbsence = hasNotReceivedEvent(
      anonymous,
      SOCKET_EVENTS.RESERVATION_CREATED,
    );
    gateway.emitToRoom(
      'public',
      SOCKET_EVENTS.RESERVATION_CREATED,
      privateBroadcast,
    );
    await expect(privateRoomAbsence).resolves.toBe(true);

    const privateSettingEvents = [admin, owner].map((socket) =>
      waitForEvent(socket, SOCKET_EVENTS.SETTINGS_UPDATED),
    );
    const privateSettingNonRecipients = [
      anonymous,
      client,
      stylist,
      pendingStylist,
    ].map((socket) =>
      hasNotReceivedEvent(socket, SOCKET_EVENTS.SETTINGS_UPDATED),
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
    await expect(
      connectWithAuth({ token: jwtService.sign({ sub: 'client-1' }) }),
    ).rejects.toThrow('Unauthorized');

    mockPrisma.user.findUnique.mockRejectedValueOnce(
      new Error('Prisma unavailable'),
    );
    await expect(connectSocket('client-1', ['CLIENT'])).rejects.toThrow(
      'Unauthorized',
    );
  });

  it('revokes all user sockets on role/account changes and token expiry', async () => {
    const firstSession = await connectSocket('revoked-stylist-1', ['CLIENT']);
    const secondSession = await connectSocket('revoked-stylist-1', ['STYLIST']);
    await waitForRoomMembers('user:revoked-stylist-1', [
      firstSession.id,
      secondSession.id,
    ]);

    const firstDisconnect = waitForDisconnect(firstSession);
    const secondDisconnect = waitForDisconnect(secondSession);
    currentUsers.set('revoked-stylist-1', {
      isActive: true,
      userRoles: [{ role: { name: 'CLIENT' } }],
      stylistProfile: null,
    });
    gateway.disconnectUserSockets('revoked-stylist-1');
    await expect(
      Promise.all([firstDisconnect, secondDisconnect]),
    ).resolves.toEqual(['io server disconnect', 'io server disconnect']);
    await waitForRoomMembers('user:revoked-stylist-1', []);

    const reconnected = await connectSocket('revoked-stylist-1', ['STYLIST']);
    await waitForRoomMembers('user:revoked-stylist-1', [reconnected.id]);
    const stylistRoom = await gateway.server.in('stylists').fetchSockets();
    expect(
      stylistRoom.some((socket) => socket.data.userId === 'revoked-stylist-1'),
    ).toBe(false);

    const accountDisconnect = waitForDisconnect(reconnected);
    currentUsers.set('revoked-stylist-1', {
      isActive: false,
      userRoles: [{ role: { name: 'CLIENT' } }],
      stylistProfile: null,
    });
    gateway.disconnectUserSockets('revoked-stylist-1');
    await expect(accountDisconnect).resolves.toBe('io server disconnect');
    await expect(
      connectSocket('revoked-stylist-1', ['SYSTEM_ADMIN']),
    ).rejects.toThrow('Unauthorized');

    const expiringSession = await connectSocket('expiring-1', ['CLIENT'], 2);
    const expiryDisconnect = waitForDisconnect(expiringSession);
    await waitForRoomMembers('user:expiring-1', [expiringSession.id]);
    await expect(expiryDisconnect).resolves.toBe('io server disconnect');
    await waitForRoomMembers('user:expiring-1', []);
  });
});
