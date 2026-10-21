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

type GatewaySocketData = { userId?: string; roles?: string[] };
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

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: GatewayServer;
  private readonly logger = new Logger(EventsGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>();

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

    const payload = this.jwtService.verify<{ sub?: string }>(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new Error('Invalid JWT subject');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        isActive: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user?.isActive) throw new Error('Inactive or unknown user');

    client.data.userId = payload.sub;
    client.data.roles = user.userRoles.map((userRole) => userRole.role.name);
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

    this.logger.log(`User ${userId} connected (socket: ${client.id})`);
  }

  handleDisconnect(client: GatewaySocket) {
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
    this.server.emit(event, data);
  }

  emitToRoom(room: string, event: string, data: unknown) {
    this.server.to(room).emit(event, data);
  }
}
