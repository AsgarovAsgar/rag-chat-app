import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, Trash2 } from 'lucide-react'

import { deleteDocument, fetchDocuments, retryDocument } from '@/api/documents'
import { queryKeys } from '@/api/queryKeys'
import { DocumentUpload } from '@/components/DocumentUpload'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const statusVariant = {
  pending: 'secondary',
  processing: 'secondary',
  ready: 'default',
  failed: 'destructive',
} as const

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsPage() {
  const queryClient = useQueryClient()
  const { data: documents, isPending, error } = useQuery({
    queryKey: queryKeys.documents,
    queryFn: fetchDocuments,
    refetchInterval: (query) => {
      const docs = query.state.data
      if (!docs) return false
      const isBusy = docs.some((d) => d.status === 'pending' || d.status === 'processing')
      return isBusy ? 2000 : false
    },
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.documents })

  const deleteMutation = useMutation({ mutationFn: deleteDocument, onSuccess: invalidate })
  const retryMutation = useMutation({ mutationFn: retryDocument, onSuccess: invalidate })

  const isRowBusy = (id: string) =>
    (deleteMutation.isPending && deleteMutation.variables === id) ||
    (retryMutation.isPending && retryMutation.variables === id)

  if (isPending) return <div className="p-4">Loading…</div>
  if (error) return <div className="p-4 text-destructive">{error.message}</div>

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-medium">Documents</h1>
        <DocumentUpload />
      </div>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead>Filename</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-24">Size</TableHead>
            <TableHead className="w-28">Uploaded</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="truncate">{doc.filename}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[doc.status]} title={doc.error ?? undefined}>
                  {doc.status}
                </Badge>
              </TableCell>
              <TableCell>{formatBytes(doc.sizeBytes)}</TableCell>
              <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  {doc.status === 'failed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Retry"
                      disabled={isRowBusy(doc.id)}
                      onClick={() => retryMutation.mutate(doc.id)}
                    >
                      <RotateCcw />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    disabled={isRowBusy(doc.id)}
                    onClick={() => {
                      if (window.confirm(`Delete "${doc.filename}"?`)) {
                        deleteMutation.mutate(doc.id)
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}