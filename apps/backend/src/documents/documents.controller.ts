import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import { DocumentsService } from './documents.service';

const UPLOAD_DIR = './uploads';
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.md']);

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) =>
          cb(
            null,
            `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
          ),
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (ALLOWED_EXTENSIONS.has(ext)) cb(null, true);
        else
          cb(new BadRequestException(`Unsupported file type: ${ext}`), false);
      },
    }),
  )
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.documentsService.createFromUpload(file);
  }

  @Get()
  async list() {
    return this.documentsService.findAll();
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.documentsService.remove(id);
  }

  @Post(':id/retry')
  @HttpCode(202)
  async retry(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.documentsService.retry(id);
  }
}
