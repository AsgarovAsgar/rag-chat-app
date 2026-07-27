import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { parseCookie } from 'cookie';
import { Server, Socket } from 'socket.io';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth.constants';

interface AccessTokenPayload {
  sub: string;
}

@WebSocketGateway()
export class DocumentsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(DocumentsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  @WebSocketServer()
  server!: Server;

  async handleConnection(client: Socket): Promise<void> {
    try {
      const cookies = parseCookie(client.handshake.headers.cookie ?? '');
      const token = cookies[ACCESS_TOKEN_COOKIE];
      if (!token) {
        throw new Error('No access token');
      }

      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      await client.join(`user:${payload.sub}`);
    } catch {
      this.logger.warn(`Rejected unauthenticated socket ${client.id}`);
      client.disconnect(true);
    }
  }

  emitDocumentStatus(payload: {
    id: string;
    userId: string;
    status: string;
    error?: string | null;
  }) {
    const { userId, ...event } = payload;
    this.server.to(`user:${userId}`).emit('document:status', event);
  }
}
