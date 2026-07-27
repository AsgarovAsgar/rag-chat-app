import { apiFetch } from "./http"

export interface AuthUser {
  id: string
  email: string
}

export interface Credentials {
  email: string
  password: string
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] }
    if(Array.isArray(body.message)) return body.message.join(', ')
    if(typeof body.message === 'string') return body.message
  } catch {
    // non-JSON error body — fall through to the generic message
  }
  return fallback
}

export async function register(credentials: Credentials): Promise<AuthUser> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  })

  if(!res.ok) throw new Error(await readError(res, `Registration failed: ${res.status}`))
  return res.json()
}

export async function login(credentials:Credentials): Promise<AuthUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  })

  if(!res.ok) throw new Error(await readError(res, `Login failed: ${res.status}`))
  return res.json()
}

export async function logout(): Promise<void> {
  const res = await fetch('/api/auth/logout', { method: 'POST' })
  if(!res.ok) throw new Error(`Logout failed: ${res.status}`)
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await apiFetch('/api/auth/me')
  if(res.status === 401) return null
  if(!res.ok) throw new Error(`Failed to load session: ${res.status}`)
  return res.json()
}