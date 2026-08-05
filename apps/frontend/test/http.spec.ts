import { beforeEach, describe, expect, it, vi } from 'vitest'

const setQueryData = vi.fn()

vi.mock('@/lib/queryClient', () => ({
  queryClient: { setQueryData: (...args: unknown[]) => setQueryData(...args) },
}))

async function importApiFetch() {
  vi.resetModules()
  return (await import('@/api/http')).apiFetch
}

function response(status: number) {
  return new Response(null, { status })
}

describe('apiFetch', () => {
  beforeEach(() => {
    setQueryData.mockClear()
  })

  it('returns the response untouched when the request succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200))
    vi.stubGlobal('fetch', fetchMock)
    const apiFetch = await importApiFetch()

    const res = await apiFetch('/api/documents')

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(setQueryData).not.toHaveBeenCalled()
  })

  it('refreshes and retries once when the request 401s', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(200))
      .mockResolvedValueOnce(response(200))
    vi.stubGlobal('fetch', fetchMock)
    const apiFetch = await importApiFetch()

    const res = await apiFetch('/api/documents')

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/refresh')
    expect(fetchMock.mock.calls[2][0]).toBe('/api/documents')
  })

  it('forwards the original init on the retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(200))
      .mockResolvedValueOnce(response(200))
    vi.stubGlobal('fetch', fetchMock)
    const apiFetch = await importApiFetch()

    const init = { method: 'POST', body: '{"a":1}' }
    await apiFetch('/api/conversations', init)

    expect(fetchMock.mock.calls[2][1]).toEqual(init)
  })

  it('clears the cached user and returns the 401 when refresh fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(401))
    vi.stubGlobal('fetch', fetchMock)
    const apiFetch = await importApiFetch()

    const res = await apiFetch('/api/documents')

    expect(res.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(setQueryData).toHaveBeenCalledWith(['me'], null)
  })

  it('sends only one refresh for concurrent 401s', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/auth/refresh') return Promise.resolve(response(200))
      return Promise.resolve(response(fetchMock.mock.calls.length <= 3 ? 401 : 200))
    })
    vi.stubGlobal('fetch', fetchMock)
    const apiFetch = await importApiFetch()

    const results = await Promise.all([
      apiFetch('/api/documents'),
      apiFetch('/api/conversations'),
      apiFetch('/api/messages'),
    ])

    const refreshCalls = fetchMock.mock.calls.filter(c => c[0] === '/api/auth/refresh')
    expect(refreshCalls).toHaveLength(1)
    expect(results.every(r => r.status === 200)).toBe(true)
  })
})