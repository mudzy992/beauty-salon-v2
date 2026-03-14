import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.join('public');
        this.logger.log(`Anonymous client connected: ${client.id}`);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.data.userId = userId;
      client.data.roles = payload.roles || [];

      client.join(`user:${userId}`);
      if (payload.roles?.includes('SYSTEM_ADMIN') || payload.roles?.includes('OWNER')) {
        client.join('admin');
      }
      if (payload.roles?.includes('STYLIST')) {
        client.join('stylists');
      }

      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      this.logger.log(`User ${userId} connected (socket: ${client.id})`);
    } catch {
      client.join('public');
      this.logger.warn(`Client ${client.id} connected with invalid token`);
    }
  }

  handleDisconnect(client: Socket) {
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
