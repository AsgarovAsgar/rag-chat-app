import { useQuery } from '@tanstack/react-query'
import { MessageSquarePlusIcon } from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarRail,
} from '@/components/ui/sidebar'
import { useChatStore } from '@/store/chatStore'
import { DocumentsPanel } from '@/components/DocumentsPanel'
import { AppBrand } from '@/components/app-brand'
import { NavUser } from '@/components/nav-user'

interface Conversation {
  id: string
  title: string | null
  createdAt: string
}

async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/conversations')
  if (!res.ok) throw new Error(`Failed to load conversations: ${res.status}`)
  return res.json()
}

const user = {
  name: 'Asgar',
  email: 'asgarovasgar28@gmail.com',
  avatar: '',
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const conversationId = useChatStore(s => s.conversationId)
  const selectConversation = useChatStore(s => s.selectConversation)

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  })

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppBrand />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="New chat" onClick={() => selectConversation(null)}>
              <MessageSquarePlusIcon />
              <span>New chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isPending && <p className="px-2 text-sm text-muted-foreground">Loading…</p>}
              {isError && <p className="px-2 text-sm text-destructive">{error.message}</p>}
              {data?.map(c => (
                <SidebarMenuItem key={c.id}>
                  <SidebarMenuButton
                    isActive={c.id === conversationId}
                    onClick={() => selectConversation(c.id)}
                  >
                    <span>{c.title ?? 'Untitled'}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <DocumentsPanel />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}