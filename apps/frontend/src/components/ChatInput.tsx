import { useState, useRef } from "react";
import { useChatStore } from "../store/chatStore";
import { streamChat } from "../api/chat";
import { fetchMessages } from "../api/messages";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useNavigate, useParams } from "react-router";
import { ArrowUp } from "lucide-react";

export function ChatInput() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const {conversationId} = useParams()

  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const status = useChatStore(s => s.status)

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()

    const message = input.trim()
    if(!message || status === 'streaming') return
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // new chats only: as soon as the backend reveals the id, warm the messages
    // cache, move to the conversation page, and drop the optimistic bubble
    // (the fetched messages already contain the user message)
    const onConversationCreated = async (id: string) => {
      await queryClient.fetchQuery({queryKey: ['messages', id], queryFn: () => fetchMessages(id)})
      navigate(`/c/${id}`)
      useChatStore.getState().clearPendingUserMessage()
    }

    const returnedId = await streamChat(message, conversationId, conversationId ? undefined : onConversationCreated)

    if(returnedId) {
      await queryClient.fetchQuery({
        queryKey: ['messages', returnedId], 
        queryFn: () => fetchMessages(returnedId)
      })
    }

    queryClient.invalidateQueries({queryKey: ['conversations']})
    useChatStore.getState().clearStream()
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex w-full max-w-3xl mx-auto items-end gap-2 rounded-4xl border border-border/90 bg-transparent dark:bg-muted/50 p-2 shadow-md">
        <div className="flex flex-1 items-center overflow-auto min-h-9 max-h-52 pl-3 pr-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask something about your documents..."
            className="min-h-0 resize-none rounded-none border-0 p-0 text-base md:text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin dark:bg-transparent"
            rows={1}
          />
        </div>

        <Button
          type="submit"
          size="icon"
          className="rounded-full shrink-0 size-9 cursor-pointer"
          disabled={status === 'streaming' || !input.trim()}
          aria-label="Send message"
        >
          <ArrowUp className="size-5" />
        </Button>
      </div>
    </form>
  )
}
