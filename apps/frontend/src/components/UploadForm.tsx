import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadDocument } from '@/api/documents'


export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['documents']})
      if(inputRef.current) inputRef.current.value = ''
    }
  })

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    const file = inputRef.current?.files?.[0]
    if(!file) return
    mutation.mutate(file)
  } 

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} type="file" accept='.pdf,.docx,.txt,.md' />
      <button type='submit' disabled={mutation.isPending}>
        {mutation.isPending ? 'Uploading' : 'Upload'}
      </button>
      { mutation.isError && <p>Error: {mutation.error.message}</p> }
    </form>
  )
}