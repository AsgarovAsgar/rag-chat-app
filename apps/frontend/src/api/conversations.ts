export interface Conversation {
  id: string
  title: string | null
  createdAt: string
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/conversations')
  if (!res.ok) throw new Error(`Failed to load conversations: ${res.status}`)
  return res.json()
}