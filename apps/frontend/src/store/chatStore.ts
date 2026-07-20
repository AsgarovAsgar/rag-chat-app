import { create } from "zustand";

export interface Source {
  documentId: string
  filename: string
  content: string
  similarity: number
}

type ChatStatus = 'idle' | 'streaming' | 'error'

interface ChatState {
  pendingUserMessage: string | null
  streamingText: string
  sources: Source[]
  status: ChatStatus
  error: string | null

  startStream: (message:string) => void
  finishStream: () => void
  failStream: (message: string) => void
  clearStream: () => void
  setSources: (sources: Source[]) => void
  appendToken: (token: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  pendingUserMessage: null,
  streamingText: '',
  sources: [],
  status: 'idle',
  error: null,

  startStream: (message) => set({
    status: 'streaming', pendingUserMessage: message, streamingText: '', sources: [], error: null
  }),
  finishStream: () => set({status: 'idle'}),
  failStream: (message: string) => set({status: 'error', error: message}),
  clearStream: () => set({streamingText: '', sources: [], pendingUserMessage: null}),

  setSources: (sources) => set({sources}),
  
  appendToken: (token) => set((state) => ({streamingText: state.streamingText + token})),
}))