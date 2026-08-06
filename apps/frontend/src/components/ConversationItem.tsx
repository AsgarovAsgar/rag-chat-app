import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { type Conversation, deleteConversation, renameConversation } from '@/api/conversations'
import { queryKeys } from '@/api/queryKeys'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { useChatStore } from '@/store/chatStore'

export function ConversationItem({
  conversation,
  isActive,
  onNavigate,
}: {
  conversation: Conversation
  isActive: boolean
  onNavigate: () => void
}) {
  const { isMobile } = useSidebar()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isStreaming = useChatStore(s => s.status === 'streaming' && s.streamConversationId === conversation.id)

  const rename = useMutation({
    mutationFn: (title: string) => renameConversation(conversation.id, title),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations })
      setOptimisticTitle(null)
    },
    onSuccess: updated => {
      queryClient.setQueryData<Conversation[]>(queryKeys.conversations, old =>
        old?.map(c => (c.id === updated.id ? updated : c))
      )
      setOptimisticTitle(null)
    },
  })

  const remove = useMutation({
    mutationFn: () => deleteConversation(conversation.id),
    onMutate: () => {
      const previous = queryClient.getQueryData<Conversation[]>(queryKeys.conversations)
      queryClient.setQueryData<Conversation[]>(queryKeys.conversations, old =>
        old?.filter(c => c.id !== conversation.id)
      )
      if (isActive) navigate('/')
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.conversations, context.previous)
      }
    },
  })

  if (isEditing) {
    const commit = (value: string) => {
      const title = value.trim()
      if (title && title !== conversation.title) {
        setOptimisticTitle(title)
        rename.mutate(title)
      }
      setIsEditing(false)
    }

    return (
      <SidebarMenuItem>
        <input
          defaultValue={conversation.title}
          autoFocus
          aria-label="Conversation title"
          className="h-8 w-full bg-transparent px-2 text-sm outline-none"
          onFocus={e => e.currentTarget.select()}
          onKeyDown={e => {
            if (e.key === 'Enter') commit(e.currentTarget.value)
            if (e.key === 'Escape') setIsEditing(false)
          }}
          onBlur={e => commit(e.currentTarget.value)}
        />
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        className="group-hover/menu-item:bg-sidebar-accent group-hover/menu-item:text-sidebar-accent-foreground"
        render={<Link to={`/c/${conversation.id}`} onClick={onNavigate} />}
      >
        <span>{optimisticTitle ?? conversation.title}</span>
      </SidebarMenuButton>

      <DropdownMenu >
        <DropdownMenuTrigger
          render={<SidebarMenuAction showOnHover className="cursor-pointer aria-expanded:opacity-100 aria-expanded:text-sidebar-foreground group-focus-within/menu-item:opacity-0 group-hover/menu-item:opacity-100 text-muted-foreground peer-hover/menu-button:text-muted-foreground hover:bg-transparent hover:text-sidebar-foreground"/>}
        >
          <MoreHorizontalIcon />
          <span className="sr-only">More</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-fit"
          side={isMobile ? 'bottom' : 'right'}
          align={isMobile ? 'end' : 'start'}
        >
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <PencilIcon />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            variant="destructive" 
            disabled={isStreaming}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2Icon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete “{conversation.title}” and all of its
              messages. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false)
                remove.mutate()
              }} 
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarMenuItem>
  )
}