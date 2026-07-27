export const queryKeys = {
  me: ['me'] as const,
  conversations: ['conversations'] as const,
  documents: ['documents'] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const
}