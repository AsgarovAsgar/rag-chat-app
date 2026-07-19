import { create } from "zustand";

export interface Source {
  documentId: string
  filename: string
  content: string
  similarity: number
}

type ChatStatus = 'idle' | 'streaming' | 'error'

interface ChatState {
  streamingText: string
  sources: Source[]
  status: ChatStatus
  error: string | null

  startStream: () => void
  finishStream: () => void
  failStream: (message: string) => void
  clearStream: () => void
  setSources: (sources: Source[]) => void
  appendToken: (token: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  streamingText: '',
  sources: [],
  status: 'idle',
  error: null,

  startStream: () => set({status: 'streaming', streamingText: '', sources: [], error: null}),
  finishStream: () => set({status: 'idle'}),
  failStream: (message: string) => set({status: 'error', error: message}),
  clearStream: () => set({streamingText: '', sources: []}),

  setSources: (sources) => set({sources}),
  
  appendToken: (token) => set((state) => ({streamingText: state.streamingText + token})),
}))