import { create } from "zustand";

export interface Source {
  documentId: string
  filename: string
  content: string
  similarity: number
}

type ChatStatus = 'idle' | 'streaming' | 'error'

interface ChatState {
  conversationId: string | null
  streamingText: string
  sources: Source[]
  status: ChatStatus
  error: string | null

  startStream: () => void
  finishStream: () => void
  failStream: (message: string) => void
  clearStream: () => void
  setSources: (conversationId: string, sources: Source[]) => void
  appendToken: (token: string) => void
  selectConversation: (id: string | null) => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversationId: null,
  streamingText: '',
  sources: [],
  status: 'idle',
  error: null,

  startStream: () => set({status: 'streaming', streamingText: '', sources: [], error: null}),
  finishStream: () => set({status: 'idle'}),
  failStream: (message: string) => set({status: 'error', error: message}),
  clearStream: () => set({streamingText: ''}),

  setSources: (conversationId, sources) => set({conversationId, sources}),
  
  appendToken: (token) => set((state) => ({streamingText: state.streamingText + token})),

  selectConversation: (id) => 
    set({conversationId: id, streamingText: '', sources: [], status: 'idle', error: null})

}))