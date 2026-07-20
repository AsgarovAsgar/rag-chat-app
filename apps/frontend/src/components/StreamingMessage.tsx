import { useChatStore } from "../store/chatStore";
import { MessageBubble } from "./MessageBubble";
import { SourceChips } from "./SourceChips";
import { CitedText } from "./CitedText";
import { extractCitations } from "@/lib/citations"
import { useLayoutEffect, useRef } from "react";


export function StreamingMessage() {
  const pendingUserMessage = useChatStore(s => s.pendingUserMessage)
  const streamingText = useChatStore(s => s.streamingText)
  const sources = useChatStore(s => s.sources)
  const status = useChatStore(s => s.status)
  const error = useChatStore(s => s.error)

  const bottomRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({block: 'end'})
  }, [pendingUserMessage, streamingText])

  return (
    <>
      {pendingUserMessage && <MessageBubble role="user">{pendingUserMessage}</MessageBubble>}
      {status === 'streaming' && !streamingText && (
        <MessageBubble role="assistant">
          <span className="text-muted-foreground animate-pulse">Thinking…</span>
        </MessageBubble>
      )}
      {streamingText && <MessageBubble role="assistant"><CitedText text={streamingText} /></MessageBubble>}
      {sources.length > 0 && <SourceChips sources={sources} cited={extractCitations(streamingText)} />}
      {error && <p className="text-destructive">{error}</p>}
      <div ref={bottomRef} />
    </>
  )
}