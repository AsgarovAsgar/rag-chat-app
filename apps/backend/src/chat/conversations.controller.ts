import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChatService } from './chat.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.listConversations(user.id);
  }

  @Get(':id/messages')
  messages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.getMessages(id, user.id);
  }
}
