import { useChatStore } from "../store/chatStore";
import { MessageBubble } from "./MessageBubble";
import { SourceChips } from "./SourceChips";

export function StreamingMessage() {
  const pendingUserMessage = useChatStore(s => s.pendingUserMessage)
  const streamingText = useChatStore(s => s.streamingText)
  const sources = useChatStore(s => s.sources)
  const status = useChatStore(s => s.status)
  const error = useChatStore(s => s.error)

  return (
    <>
      {pendingUserMessage && <MessageBubble role="user">{pendingUserMessage}</MessageBubble>}
      {status === 'streaming' && !streamingText && (
        <MessageBubble role="assistant">
          <span className="text-muted-foreground animate-pulse">Thinking…</span>
        </MessageBubble>
      )}
      {streamingText && <MessageBubble role="assistant">{streamingText}</MessageBubble>}
      {sources.length > 0 && <SourceChips sources={sources} />}
      {error && <p className="text-destructive">{error}</p>}
    </>
  )
}