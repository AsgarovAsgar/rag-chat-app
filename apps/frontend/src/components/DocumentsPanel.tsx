import { useQuery } from '@tanstack/react-query'

interface Document {
  id: string
  filename: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  error: string | null
  sizeBytes: number
  createdAt: string
}

async function fetchDocuments(): Promise<Document[]> {
  const res = await fetch('/api/documents')
  if (!res.ok) throw new Error(`Failed to load documents: ${res.status}`)
  return res.json()
}

export function DocumentsPanel() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
  })

  if (isPending) return <p>Loading documents…</p>
  if (isError) return <p>Error: {error.message}</p>

  return (
    <section>
      <h2>Documents</h2>
      {data.length === 0 ? (
        <p>No documents yet.</p>
      ) : (
        <ul>
          {data.map(d => (
            <li key={d.id}>
              {d.filename} — <strong>{d.status}</strong>
              {d.status === 'failed' && d.error ? ` (${d.error})` : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}