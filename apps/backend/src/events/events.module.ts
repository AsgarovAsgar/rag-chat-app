import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentsGateway } from './documents.gateway';

@Module({
  imports: [AuthModule],
  providers: [DocumentsGateway],
  exports: [DocumentsGateway],
})
export class EventsModule {}
