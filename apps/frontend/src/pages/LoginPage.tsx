import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router'

import { login } from '@/api/auth'
import { queryKeys } from '@/api/queryKeys'
import { AuthForm } from '@/components/AuthForm'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: user => {
      queryClient.setQueryData(queryKeys.me, user)
      navigate(from, { replace: true })
    },
  })

  return (
    <AuthForm
      title="Sign in"
      submitLabel="Sign in"
      passwordAutoComplete="current-password"
      isPending={mutation.isPending}
      error={mutation.error?.message ?? null}
      onSubmit={mutation.mutate}
      footer={<>No account? <Link to="/register" className="underline">Create one</Link></>}
    />
  )
}