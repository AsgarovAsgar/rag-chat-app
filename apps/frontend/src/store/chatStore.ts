import { create } from "zustand";
import { type Source } from "@/api/messages";


type ChatStatus = 'idle' | 'streaming' | 'error'

interface ChatState {
  streamConversationId: string | null
  pendingUserMessage: string | null
  streamingText: string
  sources: Source[]
  status: ChatStatus
  error: string | null

  startStream: (message: string, streamConversationId: string | null) => void
  finishStream: () => void
  failStream: (message: string) => void
  clearStream: () => void
  clearPendingUserMessage: () => void
  setStreamConversationId: (id: string) => void
  setSources: (sources: Source[]) => void
  appendToken: (token: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  streamConversationId: null,
  pendingUserMessage: null,
  streamingText: '',
  sources: [],
  status: 'idle',
  error: null,

  startStream: (message, streamConversationId) => set({
    status: 'streaming', pendingUserMessage: message, streamConversationId, streamingText: '', sources: [], error: null
  }),
  finishStream: () => set({status: 'idle'}),
  failStream: (message: string) => set({status: 'error', error: message}),
  clearStream: () => set({streamConversationId: null, streamingText: '', sources: [], pendingUserMessage: null, error: null}),
  clearPendingUserMessage: () => set({pendingUserMessage: null}),

  setStreamConversationId: (id) => set({streamConversationId: id}),
  setSources: (sources) => set({sources}),
  
  appendToken: (token) => set((state) => ({streamingText: state.streamingText + token})),
}))