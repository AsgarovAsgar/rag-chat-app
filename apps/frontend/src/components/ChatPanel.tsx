import { useState } from "react";
import { useChatStore } from "../store/chatStore";
import { streamChat } from "../api/chat";
import { useQueryClient } from "@tanstack/react-query";
import { MessageList } from "./MessageList";
import { SourceChips } from "./SourceChips";

export function ChatPanel() {
  const queryClient = useQueryClient()

  const [input, setInput] = useState('')
  const conversationId = useChatStore(s => s.conversationId)
  const streamingText = useChatStore(s => s.streamingText)
  const sources = useChatStore(s => s.sources)
  const status = useChatStore(s => s.status)
  const error = useChatStore(s => s.error)

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()

    const message = input.trim()
    if(!message || status === 'streaming') return
    setInput('')
    await streamChat(message, conversationId)
    
    const freshId = useChatStore.getState().conversationId
    if(freshId) {
      await queryClient.invalidateQueries({queryKey: ['messages', freshId]})
    }

    queryClient.invalidateQueries({queryKey: ['conversations']})
    useChatStore.getState().clearStream()
  }

  return (
    <section>
      <h2>Chat</h2>
      <MessageList />
      {streamingText && <p>{streamingText}</p>}
      {sources.length > 0 && <SourceChips sources={sources} />}
      {error && <p>{error}</p>}

      <form onSubmit={handleSubmit}>
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something about your document..."
        />
        <button type="submit" disabled={status === 'streaming'}>Send</button>
      </form>
    </section>
  )
}