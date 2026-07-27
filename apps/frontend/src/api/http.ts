import { queryClient } from "@/lib/queryClient"

import { queryKeys } from "./queryKeys"

let refreshPromise: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
  refreshPromise ??= fetch('/api/auth/refresh', { method: 'POST' })
    .then(res => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

export async function apiFetch(input:string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if(res.status !== 401) return res

  const refreshed = await refreshSession()
  if(!refreshed) {
    queryClient.setQueryData(queryKeys.me, null)
    return res
  }

  return fetch(input, init)
}