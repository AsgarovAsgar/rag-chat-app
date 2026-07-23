export const queryKeys = {
  conversations: ['conversations'] as const,
  documents: ['documents'] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const
}