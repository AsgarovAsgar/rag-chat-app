import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { SearchDto } from './dto/search.dto';
import { RetrievalService } from './retrieval.service';

@Controller('retrieval')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  @Post('search')
  @HttpCode(200)
  search(@Body() dto: SearchDto) {
    return this.retrievalService.search(dto.query, dto.topK);
  }
}
