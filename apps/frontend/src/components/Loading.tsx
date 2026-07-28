import { LoaderCircleIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircleIcon className={cn('size-6 animate-spin text-muted-foreground', className)} />
}

export function Loading({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      // 200ms delay with backwards fill: a fast load never flashes a spinner
      className={cn(
        'grid flex-1 place-items-center p-4',
        'animate-in fade-in [animation-delay:200ms] [animation-fill-mode:backwards]',
        className,
      )}
    >
      <Spinner />
      <span className="sr-only">{label}</span>
    </div>
  )
}