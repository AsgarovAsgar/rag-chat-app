import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { SearchDto } from './dto/search.dto';
import { RetrievalService } from './retrieval.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';

@Controller('retrieval')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  @Post('search')
  @HttpCode(200)
  search(@Body() dto: SearchDto, @CurrentUser() user: AuthenticatedUser) {
    return this.retrievalService.search(dto.query, user.id, dto.topK);
  }
}
