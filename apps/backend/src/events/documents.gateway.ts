import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class DocumentsGateway {
  @WebSocketServer()
  server!: Server;

  emitDocumentStatus(payload: {
    id: string;
    status: string;
    error?: string | null;
  }) {
    this.server.emit('document:status', payload);
  }
}
