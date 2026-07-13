import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { extractRawText } from 'mammoth';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class ExtractionService {
  async extractText(storagePath: string): Promise<string> {
    const ext = extname(storagePath).toLowerCase();

    switch (ext) {
      case '.pdf': {
        const buffer = await readFile(storagePath);
        const parser = new PDFParse({ data: buffer });
        try {
          const result = await parser.getText();
          return result.text;
        } finally {
          await parser.destroy();
        }
      }
      case '.docx': {
        const result = await extractRawText({ path: storagePath });
        return result.value;
      }
      case '.txt':
      case '.md':
        return readFile(storagePath, 'utf8');
      default:
        throw new Error(`Unsupported file extension: ${ext}`);
    }
  }
}
