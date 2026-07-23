import { ChatInput } from "@/components/ChatInput";
import { useChatStore } from "@/store/chatStore";

export function HomePage() {
  const streamConversationId = useChatStore(s => s.streamConversationId)
  const error = useChatStore(s => s.error)

  return (
    <section className="flex min-h-0 flex-1 flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-4">
        <h1 className="text-center text-4xl font-medium">Hello, Asgar!</h1>
        <ChatInput />
        {streamConversationId === null && error && <p className="text-center text-destructive">{error}</p>}
      </div>
    </section>
  )
}
