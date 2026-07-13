import { Injectable } from '@nestjs/common';

export interface TextChunk {
  index: number;
  text: string;
}

const CHARS_PER_TOKEN = 4; // heuristic; chunks are far below the 8191-token embedding limit
const MAX_CHUNK_CHARS = 800 * CHARS_PER_TOKEN;
const OVERLAP_CHARS = 100 * CHARS_PER_TOKEN;

@Injectable()
export class ChunkingService {
  chunk(text: string): TextChunk[] {
    const normalized = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (!normalized) return [];

    // Every piece is guaranteed <= MAX_CHUNK_CHARS after splitToFit.
    const pieces = normalized
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .flatMap((p) => this.splitToFit(p, MAX_CHUNK_CHARS));

    const texts: string[] = [];
    let current = '';
    for (const piece of pieces) {
      if (!current) {
        current = piece;
      } else if (current.length + 2 + piece.length <= MAX_CHUNK_CHARS) {
        current += '\n\n' + piece;
      } else {
        texts.push(current);
        current = this.overlapTail(current) + piece;
      }
    }
    if (current) texts.push(current);

    return texts.map((text, index) => ({ index, text }));
  }

  /**
   * Split oversized text by progressively cruder boundaries:
   * sentences, then words, then hard character slices.
   */
  private splitToFit(text: string, limit: number): string[] {
    if (text.length <= limit) return [text];

    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      return this.pack(
        sentences.flatMap((s) => this.splitToFit(s, limit)),
        limit,
      );
    }

    const words = text.split(/\s+/);
    if (words.length > 1) {
      return this.pack(
        words.flatMap((w) => this.splitToFit(w, limit)),
        limit,
      );
    }

    // Single unbreakable token (URL, base64 blob): hard slice.
    const slices: string[] = [];
    for (let i = 0; i < text.length; i += limit) {
      slices.push(text.slice(i, i + limit));
    }
    return slices;
  }

  private pack(parts: string[], limit: number): string[] {
    const out: string[] = [];
    let current = '';
    for (const part of parts) {
      if (!current) {
        current = part;
      } else if (current.length + 1 + part.length <= limit) {
        current += ' ' + part;
      } else {
        out.push(current);
        current = part;
      }
    }
    if (current) out.push(current);
    return out;
  }

  /** Last ~OVERLAP_CHARS of a chunk, trimmed to a word boundary. */
  private overlapTail(text: string): string {
    const tail = text.slice(-OVERLAP_CHARS);
    const firstSpace = tail.indexOf(' ');
    const clean = firstSpace === -1 ? tail : tail.slice(firstSpace + 1);
    return clean + '\n\n';
  }
}
