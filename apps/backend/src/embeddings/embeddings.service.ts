import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100; // API caps at 2048 inputs / 300k tokens per request

@Injectable()
export class EmbeddingsService {
  private readonly client: OpenAI;

  constructor(configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: configService.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async embed(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const response = await this.client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
      });

      if (response.data.length !== batch.length) {
        throw new Error(
          `Embedding count mismatch: sent ${batch.length}, got ${response.data.length}`,
        );
      }

      const ordered = [...response.data].sort((a, b) => a.index - b.index);
      for (const item of ordered) {
        vectors.push(item.embedding);
      }
    }

    return vectors;
  }
}
