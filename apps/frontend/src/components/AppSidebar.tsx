import { useQuery } from '@tanstack/react-query'
import { FileText, MessageSquarePlusIcon } from 'lucide-react'
import { Link, useMatch } from 'react-router'

import { fetchConversations } from '@/api/conversations'
import { queryKeys } from '@/api/queryKeys'
import { AppBrand } from '@/components/AppBrand'
import { ConversationItem } from '@/components/ConversationItem'
import { Spinner } from '@/components/Loading'
import { NavUser } from '@/components/NavUser'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const isHomeActive = !!useMatch('/')
  const isDocumentsActive = !!useMatch('/documents')
  const activeId = useMatch('/c/:conversationId')?.params.conversationId

  // navigating leaves the mobile sheet open — it isn't tied to the router
  const { setOpenMobile } = useSidebar()
  const closeOnMobile = () => setOpenMobile(false)

  const { data, isPending, isError, error } = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: fetchConversations,
  })

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppBrand />
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="New chat" render={<Link to="/" onClick={closeOnMobile} />}  isActive={isHomeActive}>
              <MessageSquarePlusIcon />
              <span>New chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Documents" render={<Link to="/documents" onClick={closeOnMobile} />} isActive={isDocumentsActive}>
              <FileText />
              <span>Documents</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {isPending && <Spinner className="mx-auto my-2 size-4" />}
              {isError && <p className="px-2 text-sm text-destructive">{error.message}</p>}
              {data?.length === 0 && (
                <p className="px-2 text-sm text-muted-foreground">No conversations yet</p>
              )}
              {data?.map(c => (
                <ConversationItem
                  key={c.id}
                  conversation={c}
                  isActive={c.id === activeId}
                  onNavigate={closeOnMobile}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}