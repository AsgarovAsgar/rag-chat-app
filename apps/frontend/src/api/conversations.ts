import { apiFetch } from './http'

export interface Conversation {
  id: string
  title: string
  createdAt: string
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await apiFetch('/api/conversations')
  if (!res.ok) throw new Error(`Failed to load conversations: ${res.status}`)
  return res.json()
}

export async function deleteConversation(id:string): Promise<void> {
  const res = await apiFetch(`/api/conversations/${id}`, { method:'DELETE' })
  if(!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`)
}

export async function renameConversation(id: string, title: string): Promise<Conversation> {
  const res = await apiFetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json'},
    body: JSON.stringify({title})
  })
  if(!res.ok) throw new Error(`Failed to rename conversation: ${res.status}`)
  return res.json()
}