import { useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Square } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { stopChat, streamChat } from '@/api/chat';
import { fetchMessages } from '@/api/messages';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChatStore } from '@/store/chatStore';

export function ChatInput() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const status = useChatStore((s) => s.status);
  const streamConversationId = useChatStore((s) => s.streamConversationId);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();

    const message = input.trim();
    if (!message || status === 'streaming') return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // new chats only: as soon as the backend reveals the id, warm the messages
    // cache, move to the conversation page, and drop the optimistic bubble
    // (the fetched messages already contain the user message)
    const onConversationCreated = async (id: string) => {
      await queryClient.fetchQuery({
        queryKey: queryKeys.messages(id),
        queryFn: () => fetchMessages(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      navigate(`/c/${id}`);
      useChatStore.getState().clearPendingUserMessage();
    };

    const returnedId = await streamChat(message, conversationId, conversationId ? undefined : onConversationCreated);

    if (returnedId) {
      await queryClient.fetchQuery({
        queryKey: queryKeys.messages(returnedId),
        queryFn: () => fetchMessages(returnedId),
      });
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    useChatStore.getState().clearStream();
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-4xl border border-border/90 bg-transparent p-2 shadow-md dark:bg-muted/50">
        <div className="flex max-h-52 min-h-9 flex-1 items-center overflow-auto pr-2 pl-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            className="min-h-0 resize-none scrollbar-thin rounded-none border-0 p-0 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 md:text-base dark:bg-transparent"
            rows={1}
          />
        </div>

        {status === 'streaming' && (conversationId ?? null) === streamConversationId ? (
          <Button
            type="button"
            size="icon"
            className="size-9 shrink-0 cursor-pointer rounded-full"
            aria-label="Stop streaming"
            onClick={stopChat}
          >
            <Square className="size-3.5" fill="currentColor" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="size-9 shrink-0 cursor-pointer rounded-full"
            disabled={!input.trim() || status === 'streaming'}
            aria-label="Send message"
          >
            <ArrowUp className="size-5" />
          </Button>
        )}
      </div>
    </form>
  );
}
