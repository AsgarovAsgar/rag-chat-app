import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  list() {
    return this.chatService.listConversations();
  }

  @Get(':id/messages')
  messages(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatService.getMessages(id);
  }
}
