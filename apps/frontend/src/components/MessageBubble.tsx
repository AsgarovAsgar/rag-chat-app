import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  role: 'user' | 'assistant'
  children: React.ReactNode
}

export function MessageBubble({ role, children }: MessageBubbleProps) {
  return (
    <div className={cn("flex", role === 'user' ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-2",
        role === 'user' ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted prose dark:prose-invert"
      )}>
        {children}
      </div>
    </div>
  )
}