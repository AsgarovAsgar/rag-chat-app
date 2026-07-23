import { useParams } from "react-router";

import { ChatInput } from "@/components/ChatInput";
import { MessageList } from "@/components/MessageList";
import { StreamingMessage } from "@/components/StreamingMessage";

export function ConversationPage() {
  const {conversationId} = useParams()

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 scroll-pb-2">
        <div className="mx-auto max-w-3xl space-y-2">
          <MessageList />
          <StreamingMessage />
        </div>
      </div>

      <div className="border-t p-4">
        <div className="mx-auto max-w-3xl">
          <ChatInput key={conversationId} />
        </div>
      </div>
    </section>
  )
}
