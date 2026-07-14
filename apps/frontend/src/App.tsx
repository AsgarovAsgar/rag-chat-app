import { useQuery } from '@tanstack/react-query'

interface Conversation {
  id: string
  title: string | null
  createdAt: string
}

async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/conversations')
  if(!res.ok) 
    throw new Error(`Failed to load conversations: ${res.status}`)
  return res.json()
}

function App() {

  const {data, isPending, isError, error} = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations
  })

  if (isPending) return <p>Loading conversations…</p>
  if (isError) return <p>Error: {error.message}</p>

  return(
    <div>
      <h1>Conversations</h1>
      {
        data.length === 0 ? (
          <p>No conversations yet.</p>
        ) : (
          <ul>
            {data.map(c => (
              <li key={c.id}>
                <p>{c.title ?? `Untitled - `}</p>
                <p>{new Date(c.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  )
}

export default App