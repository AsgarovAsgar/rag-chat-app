import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from 'socket.io-client'

import type { Document } from "@/api/documents";
import { queryKeys } from "@/api/queryKeys";

interface DocumentStatusEvent {
  id: string;
  status: Document['status'],
  error: string | null
}

export function useDocumentStatusUpdates() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = io()

    socket.on('document:status', (event: DocumentStatusEvent) => {
      const documents = queryClient.getQueryData<Document[]>(queryKeys.documents)

      if(!documents?.some(d => d.id === event.id)) {
        queryClient.invalidateQueries({queryKey: queryKeys.documents})
        return
      }

      queryClient.setQueryData<Document[]>(queryKeys.documents, 
        (old) => old?.map(d => d.id === event.id ? {...d, status: event.status, error: event.error}: d))
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient])
}