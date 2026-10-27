import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket, type DefaultEventsMap } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SOCKET_EVENTS } from './socket-events';
import { matchesPasswordVersion } from '../auth/password-version';
import { resolveCorsRuntimeConfig } from '../config/cors-runtime-config';

type GatewaySocketData = {
  userId?: string;
  roles?: string[];
  tokenExpiresAt?: number;
};
type GatewaySocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  GatewaySocketData
>;
type GatewayServer = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  GatewaySocketData
>;

const MAX_TIMER_DELAY_MS = 2_147_483_647;
const PUBLIC_ROOM_EVENTS: ReadonlySet<string> = new Set([
  SOCKET_EVENTS.AVAILABILITY_CHANGED,
  SOCKET_EVENTS.SETTINGS_UPDATED,
  SOCKET_EVENTS.SALON_UPDATED,
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item: unknown) => typeof item === 'string' && item.length > 0)
  );
}

function projectPublicRoomPayload(
  event: string,
  data: unknown,
): Record<string, unknown> | null {
  if (!PUBLIC_ROOM_EVENTS.has(event) || !isRecord(data)) return null;

  if (event === SOCKET_EVENTS.AVAILABILITY_CHANGED) {
    const date = data.date;
    const serviceId = data.serviceId;
    const serviceIds = data.serviceIds;
    if (!isDateOnly(date)) return null;
    if (
      serviceId !== undefined &&
      (typeof serviceId !== 'string' || serviceId.length === 0)
    ) {
      return null;
    }
    if (serviceIds !== undefined && !isStringArray(serviceIds)) return null;

    const safeServiceId = typeof serviceId === 'string' ? serviceId : undefined;
    const safeServiceIds = isStringArray(serviceIds) ? serviceIds : undefined;
    if (!safeServiceId && (!safeServiceIds || safeServiceIds.length === 0)) {
      return null;
    }
    return {
      ...(safeServiceId ? { serviceId: safeServiceId } : {}),
      ...(safeServiceIds ? { serviceIds: [...safeServiceIds] } : {}),
      date,
    };
  }

  if (event === SOCKET_EVENTS.SETTINGS_UPDATED) {
    return typeof data.key === 'string' && data.key.length > 0
      ? { key: data.key }
      : null;
  }

  if (event === SOCKET_EVENTS.SALON_UPDATED) {
    return { key: 'salon' };
  }

  return null;
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      try {
        const allowedOrigins =
          resolveCorsRuntimeConfig(process.env).allowedOrigins;
        callback(null, !origin || allowedOrigins.includes(origin));
      } catch {
        callback(new Error('CORS origin policy is not configured.'), false);
      }
    },
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: GatewayServer;
  private readonly logger = new Logger(EventsGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>();
  private readonly expiryTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit() {
    this.server.use((client, next) => {
      void this.authenticateClient(client).then(
        () => next(),
        () => next(new Error('Unauthorized')),
      );
    });
    this.logger.log('WebSocket Gateway initialized');
  }

  private getHandshakeToken(client: GatewaySocket): string | undefined {
    const authToken: unknown = client.handshake.auth?.token;
    if (authToken !== undefined) {
      if (typeof authToken !== 'string' || authToken.trim().length === 0) {
        throw new Error('Invalid JWT token');
      }
      return authToken;
    }

    const authorization: unknown = client.handshake.headers?.authorization;
    if (authorization === undefined) return undefined;
    if (typeof authorization !== 'string') {
      throw new Error('Invalid authorization header');
    }
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    const token = match?.[1]?.trim();
    if (!token) throw new Error('Invalid authorization header');
    return token;
  }

  private async authenticateClient(client: GatewaySocket): Promise<void> {
    const token = this.getHandshakeToken(client);
    client.data.roles = [];
    if (!token) return;

    const payload = this.jwtService.verify<{
      sub?: string;
      exp?: number;
      pwdv?: unknown;
    }>(token, { secret: this.configService.get<string>('JWT_SECRET') });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new Error('Invalid JWT subject');
    }
    if (typeof payload.exp !== 'number' || !Number.isSafeInteger(payload.exp)) {
      throw new Error('JWT expiration is required');
    }
    const tokenExpiresAt = payload.exp * 1000;
    if (tokenExpiresAt <= Date.now()) throw new Error('Expired JWT token');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        isActive: true,
        mustChangePassword: true,
        passwordChangedAt: true,
        userRoles: { select: { role: { select: { name: true } } } },
        stylistProfile: { select: { isActive: true, status: true } },
      },
    });
    if (
      !user?.isActive ||
      user.mustChangePassword ||
      !matchesPasswordVersion(user.passwordChangedAt, payload.pwdv)
    ) {
      throw new Error('Inactive or unknown user');
    }

    const roles = user.userRoles.map((userRole) => userRole.role.name);
    const effectiveRoles = roles.filter(
      (role) =>
        role !== 'STYLIST' ||
        (user.stylistProfile?.isActive &&
          user.stylistProfile.status === 'ACTIVE'),
    );

    client.data.userId = payload.sub;
    client.data.tokenExpiresAt = tokenExpiresAt;
    client.data.roles = effectiveRoles;
  }

  async handleConnection(client: GatewaySocket) {
    const userId = client.data.userId;
    if (!userId) {
      await client.join('public');
      this.logger.log(`Anonymous client connected: ${client.id}`);
      return;
    }

    const roles = client.data.roles ?? [];
    await client.join(`user:${userId}`);
    if (roles.includes('SYSTEM_ADMIN') || roles.includes('OWNER')) {
      await client.join('admin');
    }
    if (roles.includes('STYLIST')) {
      await client.join('stylists');
    }

    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(client.id);
    this.scheduleTokenExpiry(client);

    this.logger.log(`User ${userId} connected (socket: ${client.id})`);
  }

  private scheduleTokenExpiry(client: GatewaySocket) {
    const expiresAt = client.data.tokenExpiresAt;
    if (expiresAt === undefined) return;

    const disconnectWhenExpired = () => {
      const remainingMs = expiresAt - Date.now();
      if (remainingMs <= 0) {
        this.expiryTimers.delete(client.id);
        client.disconnect(true);
        return;
      }

      const timer = setTimeout(
        disconnectWhenExpired,
        Math.min(remainingMs, MAX_TIMER_DELAY_MS),
      );
      timer.unref();
      this.expiryTimers.set(client.id, timer);
    };

    disconnectWhenExpired();
  }

  disconnectUserSockets(userId: string) {
    this.server.in(`user:${userId}`).disconnectSockets(true);
  }

  handleDisconnect(client: GatewaySocket) {
    const expiryTimer = this.expiryTimers.get(client.id);
    if (expiryTimer) {
      clearTimeout(expiryTimer);
      this.expiryTimers.delete(client.id);
    }

    const userId = client.data?.userId;
    if (userId) {
      this.connectedUsers.get(userId)?.delete(client.id);
      if (this.connectedUsers.get(userId)?.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToAdmins(event: string, data: unknown) {
    this.server.to('admin').emit(event, data);
  }

  emitToStylists(event: string, data: unknown) {
    this.server.to('stylists').emit(event, data);
  }

  emitToAll(event: string, data: unknown) {
    const publicPayload = projectPublicRoomPayload(event, data);
    if (!publicPayload) {
      this.logger.warn(
        `Blocked invalid or non-allowlisted Socket.IO broadcast: ${event}`,
      );
      return;
    }
    this.server.emit(event, publicPayload);
  }

  emitToRoom(room: string, event: string, data: unknown) {
    if (room === 'public') {
      const publicPayload = projectPublicRoomPayload(event, data);
      if (!publicPayload) {
        this.logger.warn(
          `Blocked invalid or non-allowlisted Socket.IO public-room event: ${event}`,
        );
        return;
      }
      this.server.to(room).emit(event, publicPayload);
      return;
    }
    this.server.to(room).emit(event, data);
  }
}
