import { useState } from "react";
import { useChatStore } from "../store/chatStore";
import { streamChat } from "../api/chat";
import { useQueryClient } from "@tanstack/react-query";
import { MessageList } from "./MessageList";
import { SourceChips } from "./SourceChips";
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useNavigate, useParams } from "react-router";

export function ChatPanel() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const {conversationId} = useParams()

  const [input, setInput] = useState('')
  const streamingText = useChatStore(s => s.streamingText)
  const pendingUserMessage = useChatStore(s => s.pendingUserMessage)
  const sources = useChatStore(s => s.sources)
  const status = useChatStore(s => s.status)
  const error = useChatStore(s => s.error)

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
        <div className="mx-auto max-w-3xl">
          <MessageList />
          {pendingUserMessage && <p><strong>user:</strong> {pendingUserMessage}</p>}
          {status === 'streaming' && !streamingText && (
            <p className="text-muted-foreground animate-pulse">Thinking…</p>
          )}
          {streamingText && <p>{streamingText}</p>}
          {sources.length > 0 && <SourceChips sources={sources} />}
          {error && <p className="text-destructive">{error}</p>}
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