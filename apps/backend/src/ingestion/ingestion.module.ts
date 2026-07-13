import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IngestionProcessor } from './ingestion.processor';
import { ExtractionService } from './ingestion.extraction';

@Module({
  imports: [BullModule.registerQueue({ name: 'ingestion' })],
  providers: [IngestionProcessor, ExtractionService],
})
export class IngestionModule {}
