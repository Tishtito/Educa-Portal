import { NavLink, Outlet, useNavigation } from 'react-router'
import { GraduationCapIcon, LogOutIcon, WifiOffIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navigation, type NavItem } from '@/app/navigation'
import { useAuth } from '@/auth/useAuth'
import { ExamSwitcher } from '@/features/exams/ExamSwitcher'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useNativeBackButton } from '@/lib/native'

function useVisibleNavigation(): NavItem[] {
  const { isClassTeacher, isExaminer } = useAuth()
  return navigation.filter((item) => item.duty === 'all' || (item.duty === 'class_teacher' ? isClassTeacher : isExaminer))
}

/**
 * Phone-first, as the legacy staff portals were: most marking happens on a
 * phone in the staffroom. A bottom bar below the large breakpoint, a sidebar
 * above it.
 */
export function AppShell() {
  const items = useVisibleNavigation()
  const online = useOnlineStatus()
  const navigating = useNavigation().state !== 'idle'
  const { school, logout } = useAuth()
  useNativeBackButton()

  return (
    <div className="flex min-h-dvh bg-muted/30">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar lg:flex print:hidden">
        <Brand school={school?.name} />
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm',
                  isActive ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60',
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOutIcon className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur print:hidden">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-6">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
              <GraduationCapIcon className="size-4" />
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-2 lg:ml-0">
              <ExamSwitcher />
            </div>
          </div>
          {navigating && (
            <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden" role="progressbar" aria-label="Loading page">
              <div className="h-full w-1/3 animate-[educa-progress_1s_ease-in-out_infinite] bg-primary" />
            </div>
          )}
          {!online && (
            <div className="flex items-center justify-center gap-2 bg-amber-100 px-3 py-1 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <WifiOffIcon className="size-3.5" /> You are offline. Marks cannot be saved until you reconnect.
            </div>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 pb-24 sm:px-6 sm:py-6 lg:pb-6 print:max-w-none print:p-0">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden">
          <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn('flex flex-col items-center gap-0.5 py-2 text-[11px]', isActive ? 'font-medium text-primary' : 'text-muted-foreground')
                  }
                >
                  <item.icon className="size-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}

function Brand({ school }: { school?: string }) {
  return (
    <div className="flex h-14 items-center gap-2 border-b px-4">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCapIcon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight">Educa Staff</div>
        {school && <div className="truncate text-xs text-muted-foreground">{school}</div>}
      </div>
    </div>
  )
}
