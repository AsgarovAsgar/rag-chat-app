import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  role: 'user' | 'assistant'
  children: React.ReactNode
}

export function MessageBubble({ role, children }: MessageBubbleProps) {
  return (
    <div className={cn("flex", role === 'user' ? "justify-end" : "justify-start")}>
      <div className={cn(
        role === 'user' ? "bg-muted whitespace-pre-wrap max-w-[80%] rounded-lg px-4 py-2" : "prose dark:prose-invert"
      )}>
        {children}
      </div>
    </div>
  )
}