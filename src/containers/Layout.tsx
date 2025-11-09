import { useContext } from 'react'
import SidebarContext, { SidebarProvider } from '@/context/SidebarContext'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import Main from './Main'

interface ILayout {
  children: React.ReactNode
}

function LayoutContent({ children }: ILayout) {
  const { isSidebarOpen } = useContext(SidebarContext)

  return (
    <div
      className={`flex h-screen bg-gray-50 dark:bg-gray-900 ${isSidebarOpen && 'overflow-hidden'}`}
    >
      <Sidebar />
      <div className="flex flex-col flex-1 w-full">
        <Header />
        <Main>{children}</Main>
      </div>
    </div>
  )
}

function Layout({ children }: ILayout) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  )
}

export default Layout

