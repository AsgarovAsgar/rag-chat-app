import { useState } from "react";
import { useChatStore } from "../store/chatStore";
import { streamChat } from "../api/chat";
import { fetchMessages } from "../api/messages";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useNavigate, useParams } from "react-router";

export function ChatInput() {
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

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask something about your documents..."
        autoFocus
      />
      <Button type="submit" disabled={status === 'streaming'}>Send</Button>
    </form>
  )
}
