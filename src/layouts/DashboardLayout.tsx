import { ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { CommandPalette } from '@/components/CommandPalette'
import { useCommandPalette } from '@/components/CommandPalette/useCommandPalette'

interface DashboardLayoutProps {
  children: ReactNode
}

/**
 * Dashboard Layout
 * Wraps page content with sidebar and global command palette (Cmd/Ctrl+K).
 * Provides consistent layout for all authenticated pages.
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { open, setOpen } = useCommandPalette()

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar onOpenCommandPalette={() => setOpen(true)} />
      <CommandPalette open={open} onOpenChange={setOpen} />
      <main className="flex-1 ml-64 transition-all duration-300">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
