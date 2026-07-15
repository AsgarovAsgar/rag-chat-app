import { useState } from "react";
import { useChatStore } from "../store/chatStore";
import { streamChat } from "../api/chat";

export function ChatPanel() {
  const [input, setInput] = useState('')
  const conversationId = useChatStore(s => s.conversationId)
  const streamingText = useChatStore(s => s.streamingText)
  const status = useChatStore(s => s.status)
  const error = useChatStore(s => s.error)

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()

    const message = input.trim()
    if(!message || status === 'streaming') return
    setInput('')
    await streamChat(message, conversationId)
  }

  return (
    <section>
      <h2>Chat</h2>
      {streamingText && <p>{streamingText}</p>}
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