export interface Document {
  id: string
  filename: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  error: string | null
  sizeBytes: number
  createdAt: string
}

export async function fetchDocuments(): Promise<Document[]> {
  const res = await fetch('/api/documents')
  if (!res.ok) throw new Error(`Failed to load documents: ${res.status}`)
  return res.json()
}

export async function uploadDocument(file: File): Promise<Document> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/documents', {
    method: 'POST',
    body: formData
  })

  if (!res.ok) 
    throw new Error(`Upload failed: ${res.status}`)

  return res.json()
}

export async function deleteDocument(id:string): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
  if(!res.ok) throw new Error(`Delete failed: ${res.status}`)
}

export async function retryDocument(id:string): Promise<void> {
  const res = await fetch(`/api/documents/${id}/retry`, { method: 'POST' })
  if(!res.ok) throw new Error(`Retry failed: ${res.status}`)
}