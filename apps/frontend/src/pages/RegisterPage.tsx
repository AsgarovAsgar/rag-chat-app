import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'

import { type Credentials, login, register } from '@/api/auth'
import { queryKeys } from '@/api/queryKeys'
import { AuthForm } from '@/components/AuthForm'
import { DemoButton } from '@/components/DemoButton'

export function RegisterPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (credentials: Credentials) => {
      await register(credentials)
      return login(credentials)
    },
    onSuccess: user => {
      queryClient.setQueryData(queryKeys.me, user)
      navigate('/', { replace: true })
    },
  })

  return (
    <AuthForm
      title="Create account"
      submitLabel="Create account"
      passwordAutoComplete="new-password"
      isPending={mutation.isPending}
      error={mutation.error?.message ?? null}
      onSubmit={mutation.mutate}
      footer={<>Already have an account? <Link to="/login" className="underline">Sign in</Link></>}
      belowForm={
        <>
          <DemoButton />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Registering creates a new, empty workspace from the demo won't carry over.
          </p>
        </>
      }
    />
  )
}