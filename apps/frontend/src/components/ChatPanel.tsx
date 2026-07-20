import { useState } from "react";
import { useChatStore } from "../store/chatStore";
import { streamChat } from "../api/chat";
import { useQueryClient } from "@tanstack/react-query";
import { MessageList } from "./MessageList";
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useNavigate, useParams } from "react-router";
import { StreamingMessage } from "./StreamingMessage";

export function ChatPanel() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const {conversationId} = useParams()

  const [input, setInput] = useState('')
  const status = useChatStore(s => s.status)

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()

    const message = input.trim()
    if(!message || status === 'streaming') return
    setInput('')
    const returnedId = await streamChat(message, conversationId)
    
    if(returnedId) {
      await queryClient.invalidateQueries({queryKey: ['messages', returnedId]})
    }

    queryClient.invalidateQueries({queryKey: ['conversations']})
    useChatStore.getState().clearStream()
    if(!conversationId && returnedId) navigate(`/c/${returnedId}`)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-2">
          <MessageList />
          <StreamingMessage />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something about your documents..."
          />
          <Button type="submit" disabled={status === 'streaming'}>Send</Button>
        </div>
      </form>
    </section>
  )
}