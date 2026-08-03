import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatDto } from './dto/chat.dto';
import { ChatService } from './chat.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { Throttle } from '@nestjs/throttler';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async chat(
    @Body() dto: ChatDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    await this.chatService.chat(dto, user.id, res);
  }
}
