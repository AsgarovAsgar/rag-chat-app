import { useQuery } from "@tanstack/react-query"
import { useLayoutEffect, useRef } from "react"
import { useParams } from "react-router"

import { fetchMessages } from "@/api/messages"
import { queryKeys } from '@/api/queryKeys'
import { extractCitations } from "@/lib/citations"

import { CitedText } from "./CitedText";
import { MessageBubble } from "./MessageBubble"
import { SourceChips } from "./SourceChips"


export function MessageList() {
  const {conversationId} = useParams()
  const bottomRef = useRef<HTMLDivElement>(null)

  const {data, isError, error} = useQuery({
    queryKey: queryKeys.messages(conversationId!),
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId
  })

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({block: 'end'})
  }, [data])

  if(!conversationId) return null
  if(isError) return <p>Error: {error.message}</p>

  return (
    <>
      <ul className="space-y-2">
        {
          data?.map(m => (
            <li key={m.id}>
              <MessageBubble role={m.role}>
                {m.role === 'assistant' ? <CitedText text={m.content} /> : m.content}
              </MessageBubble>
              {m.role === 'assistant' && m.sources && m.sources.length > 0 && 
                <SourceChips sources={m.sources} cited={extractCitations(m.content)} />
              }
            </li>
          ))
        }
      </ul>
      <div ref={bottomRef} />
    </>
  )
}