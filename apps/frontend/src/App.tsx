import { Outlet,Route, Routes } from 'react-router'

import { AppSidebar } from '@/components/AppSidebar'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConversationPage } from '@/pages/ConversationPage'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { HomePage } from '@/pages/HomePage'

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
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="c/:conversationId" element={<ConversationPage />} />
        <Route path='documents' element={<DocumentsPage />} />
      </Route>
    </Routes>
  )
}

export default App
