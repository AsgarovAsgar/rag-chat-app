import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { useRef } from 'react'

import { uploadDocument } from '@/api/documents'
import { queryKeys } from '@/api/queryKeys'
import { Button } from '@/components/ui/button'

export function DocumentUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents }),
    onSettled: () => {
      if (inputRef.current) inputRef.current.value = ''
    },
  })

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) mutation.mutate(file)
  }

  return (
    <div className="flex items-center gap-2">
      {mutation.isError && (
        <span className="text-sm text-destructive">{mutation.error.message}</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={handleUpload}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={mutation.isPending}>
        <Upload />
        {mutation.isPending ? 'Uploading…' : 'Upload'}
      </Button>
    </div>
  )
}