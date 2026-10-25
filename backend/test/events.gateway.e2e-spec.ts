import { randomUUID } from 'node:crypto';
import type { Server as HttpServer } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import { AuthService } from '../src/auth/auth.service';
import { EventsGateway } from '../src/events/events.gateway';
import { SOCKET_EVENTS } from '../src/events/socket-events';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersRepository } from '../src/users/users.repository';
import { UsersService } from '../src/users/users.service';

const TEST_JWT_SECRET = 'db-backed-socket-tests-only-secret';
const OLD_PASSWORD = 'Socket old password 123!';
const NEW_PASSWORD = 'Socket new password 456!';
const LOCAL_TEST_DATABASE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
]);
const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])(test|e2e|ci)(?:$|[_-])/i;
const EVENT_TIMEOUT_MS = 3_000;
const EVENT_ABSENCE_WINDOW_MS = 500;

const getDisposableDatabaseUrl = (): string => {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) {
    throw new Error(
      'E2E_DATABASE_URL is required; use a disposable local PostgreSQL database named with test, e2e, or ci.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('E2E_DATABASE_URL is not a valid PostgreSQL URL.');
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !LOCAL_TEST_DATABASE_HOSTS.has(parsed.hostname) ||
    !TEST_DATABASE_NAME_PATTERN.test(databaseName)
  ) {
    throw new Error(
      'Refusing E2E_DATABASE_URL: tests require a local PostgreSQL database whose name contains a test, e2e, or ci segment.',
    );
  }

  return url;
};

describe('DB-backed Socket.IO authorization revocation', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService | undefined;
  let gateway: EventsGateway;
  let users: UsersService;
  let auth: AuthService;
  let jwtService: JwtService;
  let url: string;
  let userId: string | undefined;
  let passwordUserId: string | undefined;
  const clients: Socket[] = [];

  const connectWithToken = async (token: string): Promise<Socket> => {
    const socket = io(url, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      timeout: EVENT_TIMEOUT_MS,
    });
    clients.push(socket);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Timed out waiting for Socket.IO connection'));
      }, EVENT_TIMEOUT_MS);
      socket.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(error);
      });
    });

    return socket;
  };

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
    const databaseUrl = getDisposableDatabaseUrl();
    const configValues: Record<string, string> = {
      DATABASE_URL: databaseUrl,
      DATABASE_PROVIDER: 'postgres',
      JWT_SECRET: TEST_JWT_SECRET,
    };
    const configService = {
      get: (key: string, defaultValue?: string) =>
        configValues[key] ?? defaultValue,
    };
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: TEST_JWT_SECRET })],
      providers: [
        EventsGateway,
        PrismaService,
        UsersRepository,
        UsersService,
        AuthService,
        {
          provide: NotificationsService,
          useValue: { sendVerificationCodeEmail: jest.fn() },
        },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    gateway = app.get(EventsGateway);
    users = app.get(UsersService);
    auth = app.get(AuthService);
    jwtService = app.get(JwtService);

    const server = app.getHttpServer() as HttpServer;
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP address for the Socket.IO test server');
    }
    url = `http://127.0.0.1:${address.port}`;

    const role = await prisma.role.upsert({
      where: { name: 'SYSTEM_ADMIN' },
      update: {},
      create: { name: 'SYSTEM_ADMIN' },
    });
    const suffix = randomUUID().replaceAll('-', '');
    const user = await prisma.user.create({
      data: {
        username: `socket-e2e-${suffix}`,
        firstName: 'Socket',
        lastName: 'E2E',
      },
    });
    userId = user.id;
    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id },
    });

    const clientRole = await prisma.role.upsert({
      where: { name: 'CLIENT' },
      update: {},
      create: { name: 'CLIENT' },
    });
    const passwordUsername = `socket-password-e2e-${suffix}`;
    const passwordUser = await prisma.user.create({
      data: {
        username: passwordUsername,
        firstName: 'Socket',
        lastName: 'Password E2E',
        passwordHash: await bcrypt.hash(OLD_PASSWORD, 10),
      },
    });
    passwordUserId = passwordUser.id;
    await prisma.userRole.create({
      data: { userId: passwordUser.id, roleId: clientRole.id },
    });
  });

  afterAll(async () => {
    for (const client of clients) client.disconnect();
    try {
      if (prisma) {
        for (const id of [userId, passwordUserId]) {
          if (!id) continue;
          await prisma.userRole.deleteMany({ where: { userId: id } });
          await prisma.user.deleteMany({ where: { id } });
        }
      }
    } finally {
      await app?.close();
    }
  });

  it('disconnects the removed admin session and rechecks the current DB role on reconnect', async () => {
    if (!userId) throw new Error('Socket test user fixture was not created');
    const token = jwtService.sign(
      { sub: userId, roles: ['CLIENT'] },
      { expiresIn: '1h' },
    );
    const firstSession = await connectWithToken(token);
    await waitForRoomMembers(`user:${userId}`, [firstSession.id]);
    await waitForRoomMembers('admin', [firstSession.id]);

    const disconnect = waitForDisconnect(firstSession);
    await users.removeRole(userId, 'SYSTEM_ADMIN', ['OWNER']);
    await expect(disconnect).resolves.toBe('io server disconnect');
    await waitForRoomMembers('admin', []);

    const reconnectedSession = await connectWithToken(token);
    await waitForRoomMembers(`user:${userId}`, [reconnectedSession.id]);
    await waitForRoomMembers('admin', []);

    const privateEventAbsence = hasNotReceivedEvent(
      reconnectedSession,
      SOCKET_EVENTS.SETTINGS_UPDATED,
    );
    gateway.emitToAdmins(SOCKET_EVENTS.SETTINGS_UPDATED, {
      key: 'private_setting',
    });
    await expect(privateEventAbsence).resolves.toBe(true);
  });

  it('disconnects password-change sessions and accepts only the replacement token', async () => {
    if (!passwordUserId) {
      throw new Error('Password-change socket fixture was not created');
    }

    const legacyToken = jwtService.sign(
      { sub: passwordUserId, roles: ['CLIENT'] },
      { expiresIn: '1h' },
    );
    const currentSession = await connectWithToken(legacyToken);
    await waitForRoomMembers(`user:${passwordUserId}`, [currentSession.id]);

    const disconnect = waitForDisconnect(currentSession);
    const result = await auth.changePassword(passwordUserId, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    await expect(disconnect).resolves.toBe('io server disconnect');

    await expect(
      auth.validateUser(passwordUserId, undefined),
    ).resolves.toBeNull();
    await expect(connectWithToken(legacyToken)).rejects.toMatchObject({
      message: 'Unauthorized',
    });

    const replacementClaims = jwtService.verify<{ pwdv?: unknown }>(
      result.access_token,
    );
    await expect(
      auth.validateUser(passwordUserId, replacementClaims.pwdv),
    ).resolves.toMatchObject({ sub: passwordUserId, roles: ['CLIENT'] });

    const replacementSession = await connectWithToken(result.access_token);
    await waitForRoomMembers(`user:${passwordUserId}`, [replacementSession.id]);
  });
});
