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

/** Turns of history fed to the rewriter. Enough to resolve a reference without
 *  paying for the whole conversation on every message. */
const REWRITE_HISTORY_TURNS = 6;
/** A rewrite is one short sentence; this is a cap on runaway output, not a target. */
const REWRITE_MAX_TOKENS = 100;
const REWRITE_MODEL = 'gpt-4o-mini';
const REWRITE_TIMEOUT_MS = 3000;

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

  async listConversations(userId: string): Promise<ConversationRow[]> {
    const { rows } = await this.pool.query<ConversationRow>(
      `SELECT id, title, created_at AS "createdAt"
       FROM conversations
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );
    return rows;
  }

  async getMessages(
    conversationId: string,
    userId: string,
  ): Promise<MessageRow[]> {
    const { rows: found } = await this.pool.query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId],
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

  private async ensureConversation(
    dto: ChatDto,
    userId: string,
  ): Promise<string> {
    if (dto.conversationId) {
      const { rows } = await this.pool.query(
        'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
        [dto.conversationId, userId],
      );
      if (rows.length === 0) {
        throw new NotFoundException('Conversation not found');
      }
      return dto.conversationId;
    }

    const { rows } = await this.pool.query<{ id: string }>(
      'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id',
      [userId, dto.message.slice(0, 60)],
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

  private async rewriteQuery(
    message: string,
    history: HistoryMessage[],
  ): Promise<string> {
    if (history.length === 0) return message;

    const transcript = history
      .slice(-REWRITE_HISTORY_TURNS)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    try {
      const completion = await this.client.chat.completions.create(
        {
          model: REWRITE_MODEL,
          temperature: 0,
          max_tokens: REWRITE_MAX_TOKENS,
          messages: [
            {
              role: 'system',
              content: `Rewrite the user's latest message into a standalone search query for a document retrieval system.

Resolve pronouns and references ("it", "that", "the second one") using the conversation. Keep the user's own wording and topic — do not answer, do not add information, do not broaden the question.
If the message is already standalone, return it unchanged.
Return only the rewritten query, with no preamble or quotes.

Conversation so far:
${transcript}`,
            },
            { role: 'user', content: message },
          ],
        },
        { signal: AbortSignal.timeout(REWRITE_TIMEOUT_MS) },
      );

      const rewritten = completion.choices[0]?.message?.content?.trim();
      if (!rewritten) return message;

      this.logger.log(`Rewrote query: "${message}" → "${rewritten}"`);
      return rewritten;
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        this.logger.warn(
          `Query rewrite timed out after ${REWRITE_TIMEOUT_MS}ms`,
        );
      } else {
        this.logger.warn('Query rewrite failed, using original message', err);
      }
      return message;
    }
  }

  private buildSystemPrompt(sources: SearchResult[]): string {
    const context = sources
      .map((s, i) => `[${i + 1}] (${s.filename})\n${s.content}`)
      .join('\n\n');

    return `
      You are an assistant answering questions about the user's uploaded documents.
      Base your answers on the numbered context chunks below, and cite the chunks you use inline, like [1] or [2][3].
      For broad or summary questions, synthesize the best answer you can from the available chunks — they may be only a sample of the documents, so present it as what the documents cover rather than an exhaustive answer.
      If the context only partially covers the question, answer the covered part and briefly note what's missing.
      Only say you don't know when no chunk is relevant to the question. Never state facts that are not in the context.
      The chunks are the closest matches for this question, not an inventory of the user's documents. If asked what documents exist or what you have access to, say you can only see the excerpts retrieved for this question and cannot list the full set.

      Context:

      ${context}
    `;
  }

  private send(res: Response, event: string, data: unknown): void {
    if (res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  async chat(dto: ChatDto, userId: string, res: Response): Promise<void> {
    const conversationId = await this.ensureConversation(dto, userId);
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
      sources = await this.retrievalService.search(dto.message, userId, TOP_K);
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
