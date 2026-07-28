import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="grid min-h-svh place-items-center p-4">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <h1 className="text-7xl font-semibold tracking-tight">
          404<span className="sr-only"> — page not found</span>
        </h1>
        <p className="mt-4 text-muted-foreground">
          All routes lead to Rome. This one doesn't.
        </p>
        <Button render={<Link to="/" />} className="mt-6">
          Back to chat
        </Button>
      </div>
    </div>
  )
}