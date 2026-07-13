import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [BullModule.registerQueue({ name: 'ingestion' })],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
