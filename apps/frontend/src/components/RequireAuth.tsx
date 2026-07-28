import { Navigate, Outlet, useLocation } from 'react-router'

import { useMe } from '@/hooks/useMe'

import { Loading } from './Loading'

export function RequireAuth() {
  const location = useLocation()
  const { data: user, isPending, isError, error } = useMe()

  if (isPending) return <Loading className="min-h-svh" />

  if (isError) {
    return (
      <div className="grid min-h-svh place-items-center p-4 text-sm text-destructive">
        {error.message}
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  return <Outlet />
}