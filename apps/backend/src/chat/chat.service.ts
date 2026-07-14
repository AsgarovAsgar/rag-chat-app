import { Inject, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { RetrievalService } from '../retrieval/retrieval.service';
import { ChatDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly retrievalService: RetrievalService,
  ) {}

  async chat(dto: ChatDto, res: Response): Promise<void> {
    // TODO: conversation lookup/create, retrieval, LLM stream, persistence
    res.write(`event: token\ndata: ${JSON.stringify({ token: 'hello' })}\n\n`);
    res.write('event: done\ndata: {}\n\n');
    res.end();
  }
}
