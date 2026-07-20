import type { Source } from "../store/chatStore";

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: Source[] | null
  createdAt: string
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const res = await fetch(`/api/conversations/${conversationId}/messages`)
  if(!res.ok) throw new Error(`Failed to load messages: ${res.status}`)
  return res.json()
}
