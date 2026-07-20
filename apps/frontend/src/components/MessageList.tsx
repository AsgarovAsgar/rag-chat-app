import { useQuery } from "@tanstack/react-query"
import type { Source } from "../store/chatStore"
import { SourceChips } from "./SourceChips"
import { useParams } from "react-router"
import { MessageBubble } from "./MessageBubble"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: Source[] | null
  createdAt: string
}

async function fetchMessages(conversationId:string):Promise<Message[]> {
  const res = await fetch(`/api/conversations/${conversationId}/messages`)
  if(!res.ok) throw new Error(`Failed to load messages: ${res.status}`)
  return res.json()
}

export function MessageList() {
  const {conversationId} = useParams()

  const {data, isError, error} = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId
  })

  if(!conversationId) return null
  if(isError) return <p>Error: {error.message}</p>

  return (
      <ul className="space-y-2">
        {
          data?.map(m => (
            <li key={m.id}>
              <MessageBubble role={m.role}>{m.content}</MessageBubble>
              {m.role === 'assistant' && m.sources && m.sources.length > 0 && 
                <SourceChips sources={m.sources} />
              }
            </li>
          ))
        }
      </ul>
  )
}