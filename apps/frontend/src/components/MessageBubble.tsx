import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  role: 'user' | 'assistant'
  children: React.ReactNode
}

export function MessageBubble({ role, children }: MessageBubbleProps) {
  return (
    <div className={cn("flex", role === 'user' ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2",
        role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {children}
      </div>
    </div>
  )
}