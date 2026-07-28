import { useQuery } from '@tanstack/react-query'
import { FileText, MessageSquarePlusIcon } from 'lucide-react'
import { Link, useMatch } from 'react-router'

import { fetchConversations } from '@/api/conversations'
import { queryKeys } from '@/api/queryKeys'
import { AppBrand } from '@/components/AppBrand'
import { NavUser } from '@/components/NavUser'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const match = useMatch('/c/:conversationId')
  const activeId = match?.params.conversationId
  const isDocumentsActive = !!useMatch('/documents')

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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="New chat" render={<Link to="/" onClick={closeOnMobile} />}>
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
            <SidebarMenu>
              {isPending && <p className="px-2 text-sm text-muted-foreground">Loading…</p>}
              {isError && <p className="px-2 text-sm text-destructive">{error.message}</p>}
              {data?.map(c => (
                <SidebarMenuItem key={c.id}>
                  <SidebarMenuButton isActive={c.id === activeId} render={<Link to={`/c/${c.id}`} onClick={closeOnMobile} />}>
                    <span>{c.title ?? 'Untitled'}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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