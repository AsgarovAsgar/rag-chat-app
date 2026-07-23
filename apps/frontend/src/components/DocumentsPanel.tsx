import { useQuery } from '@tanstack/react-query'
import { UploadForm } from './UploadForm'
import { fetchDocuments } from '@/api/documents'


export function DocumentsPanel() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
    refetchInterval: (query) => {
      const docs = query.state.data
      if(!docs) return 
      const isBusy = docs.some(d => d.status === 'pending' || d.status === 'processing')
      return isBusy ? 2000 : false
    }
  })

  if (isPending) return <p>Loading documents…</p>
  if (isError) return <p>Error: {error.message}</p>

  return (
    <section>
      <h2>Documents</h2>
      <UploadForm />
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