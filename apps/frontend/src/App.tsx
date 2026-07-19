import { Routes, Route, Outlet, useMatch } from 'react-router'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { ChatPanel } from './components/ChatPanel'
import { TooltipProvider } from '@/components/ui/tooltip'

function AppLayout() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="h-svh">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4 data-vertical:self-center" />
            <span className="font-medium">RAG Chat</span>
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

function App() {
  const match = useMatch(`/c/:conversationId`)
  const chatKey = match?.params.conversationId ?? 'new'

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ChatPanel key={chatKey} />} />
        <Route path="c/:conversationId" element={<ChatPanel key={chatKey} />} />
      </Route>
    </Routes>
  )
}

export default App