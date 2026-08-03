import { useState } from "react";

import type { Credentials } from "@/api/auth";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AuthFormProps {
  title: string
  submitLabel: string
  passwordAutoComplete: 'current-password' | 'new-password'
  isPending: boolean
  error: string | null
  onSubmit: (credentials: Credentials) => void
  footer: React.ReactNode
  belowForm: React.ReactNode
}

export function AuthForm({
  title, submitLabel, passwordAutoComplete, isPending, error, onSubmit, footer, belowForm
}: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    onSubmit({email, password})
  }

  return (
    <div className="grid min-h-svh place-items-center p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold">{title}</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Input
              id="password"
              type="password"
              autoComplete={passwordAutoComplete}
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending}>
            {isPending ? 'Please wait…' : submitLabel}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">{footer}</p>

        {belowForm}
      </div>
    </div>
  )
}