import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IngestionProcessor } from './ingestion.processor';
import { ExtractionService } from './ingestion.extraction';
import { ChunkingService } from './ingestion.chunking';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'ingestion' }),
    EmbeddingsModule,
    EventsModule,
  ],
  providers: [IngestionProcessor, ExtractionService, ChunkingService],
})
export class IngestionModule {}
