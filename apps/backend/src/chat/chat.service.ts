import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { RetrievalService, SearchResult } from '../retrieval/retrieval.service';
import { ChatDto } from './dto/chat.dto';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

type HistoryMessage = { role: 'user' | 'assistant'; content: string };
type ConversationRow = { id: string; title: string; created_at: string };
type MessageRow = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: SearchResult[] | null;
  created_at: string;
};

const CHAT_MODEL = 'gpt-4o-mini';
const HISTORY_LIMIT = 10;
const TOP_K = 5;

@Injectable()
export class ChatService {
  private readonly client: OpenAI;
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly retrievalService: RetrievalService,
    configService: ConfigService,
  ) {
    this.client = new OpenAI({
      apiKey: configService.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async listConversations(): Promise<ConversationRow[]> {
    const { rows } = await this.pool.query<ConversationRow>(
      `SELECT id, title, created_at AS "createdAt"
       FROM conversations
       ORDER BY created_at DESC`,
    );
    return rows;
  }

  async getMessages(conversationId: string): Promise<MessageRow[]> {
    const { rows: found } = await this.pool.query(
      'SELECT id FROM conversations WHERE id = $1',
      [conversationId],
    );
    if (found.length === 0) {
      throw new NotFoundException('Conversation not found');
    }

    const { rows } = await this.pool.query<MessageRow>(
      `SELECT id, role, content, sources, created_at AS "createdAt"
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId],
    );
    return rows;
  }

  private async ensureConversation(dto: ChatDto): Promise<string> {
    if (dto.conversationId) {
      const { rows } = await this.pool.query(
        'SELECT id FROM conversations WHERE id = $1',
        [dto.conversationId],
      );
      if (rows.length === 0) {
        throw new NotFoundException('Conversation not found');
      }
      return dto.conversationId;
    }

    const { rows } = await this.pool.query<{ id: string }>(
      'INSERT INTO conversations (title) VALUES ($1) RETURNING id',
      [dto.message.slice(0, 60)],
    );
    return rows[0].id;
  }

  private async loadHistory(conversationId: string): Promise<HistoryMessage[]> {
    const { rows } = await this.pool.query<HistoryMessage>(
      `SELECT role, content FROM (
         SELECT role, content, created_at FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC
         LIMIT $2
       ) latest
       ORDER BY created_at ASC`,
      [conversationId, HISTORY_LIMIT],
    );
    return rows;
  }

  private buildSystemPrompt(sources: SearchResult[]): string {
    const context = sources
      .map((s, i) => `[${i + 1}] (${s.filename})\n${s.content}`)
      .join('\n\n');

    return `
      You are an assistant answering questions about the user's uploaded documents.
      Answer ONLY using the numbered context chunks below. Cite the chunks you used inline, like [1] or [2][3].
      If the context does not contain the answer, say you don't know — do not invent information.

      Context: ${context}
    `;
  }

  private send(res: Response, event: string, data: unknown): void {
    if (res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  async chat(dto: ChatDto, res: Response): Promise<void> {
    const conversationId = await this.ensureConversation(dto);
    const history = await this.loadHistory(conversationId);

    await this.pool.query(
      `INSERT INTO messages (conversation_id, role, content)
       VALUES ($1, 'user', $2)`,
      [conversationId, dto.message],
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    this.send(res, 'conversation', { conversationId });

    let sources: SearchResult[];

    try {
      sources = await this.retrievalService.search(dto.message, TOP_K);
    } catch (err) {
      this.logger.error('Retrieval failed', err);
      this.send(res, 'error', { message: 'Retrieval failed' });
      res.end();
      return;
    }

    this.send(res, 'sources', { sources });

    const abort = new AbortController();
    res.on('close', () => abort.abort());

    let answer = '';
    try {
      const stream = await this.client.chat.completions.create(
        {
          model: CHAT_MODEL,
          stream: true,
          messages: [
            { role: 'system', content: this.buildSystemPrompt(sources) },
            ...history,
            { role: 'user', content: dto.message },
          ],
        },
        { signal: abort.signal },
      );

      for await (const part of stream) {
        const token = part.choices[0]?.delta?.content;
        if (token) {
          answer += token;
          this.send(res, 'token', { token });
        }
      }
    } catch (err) {
      if (!abort.signal.aborted) {
        this.logger.error('Chat generation failed', err);
        this.send(res, 'error', { message: 'Generation failed' });
        res.end();
        return;
      }
      // client disconnected mid-stream: fall through and save what we have
    }

    if (answer.length > 0) {
      await this.pool.query(
        `INSERT INTO messages (conversation_id, role, content, sources)
         VALUES ($1, 'assistant', $2, $3)`,
        [conversationId, answer, JSON.stringify(sources)],
      );
    }

    this.send(res, 'done', { conversationId });
    res.end();
  }
}
