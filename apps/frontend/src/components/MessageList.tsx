import { useQuery } from "@tanstack/react-query"
import { useChatStore, type Source } from "../store/chatStore"
import { SourceChips } from "./SourceChips"

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
  const conversationId = useChatStore(s => s.conversationId)

  const {data, isError, error} = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId!),
    enabled: conversationId !== null
  })

  if(!conversationId) return null
  if(isError) return <p>Error: {error.message}</p>

  return (
      <ul>
        {
          data?.map(m => (
            <li key={m.id}>
              <div>
                <strong>{m.role}:</strong> {m.content}
              </div>
              {m.role === 'assistant' && m.sources && m.sources.length > 0 && 
                <SourceChips sources={m.sources} />
              }
            </li>
          ))
        }
      </ul>
  )
}