import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AlertTriangleIcon, LockIcon } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { SubscriptionState } from '@/lib/api/types'
import { formatDate } from '@/lib/format'

/** The school's subscription as the API reported it at sign-in (or after a 402). */
export function useSubscription(): SubscriptionState | null {
  const { user } = useAuth()
  return user?.school?.subscription ?? null
}

/**
 * Blurs and disables what it wraps while the school's subscription has lapsed.
 * The API refuses marking, mark lists and report cards as well (402); this is
 * so teachers see why instead of a page of errors. Renewal happens in Educa
 * Admin, so there is nothing to pay here.
 */
export function SubscriptionLock({ children }: { children: ReactNode }) {
  const subscription = useSubscription()
  const { school } = useAuth()
  const locked = subscription?.status === 'overdue'

  return (
    <div className="relative">
      <div
        className={cn(locked && 'pointer-events-none max-h-[70dvh] overflow-hidden blur-sm select-none')}
        aria-hidden={locked || undefined}
        inert={locked || undefined}
      >
        {children}
      </div>
      {locked && subscription && (
        <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/40 p-4 pt-12">
          <Card className="w-full max-w-md shadow-lg" role="alertdialog" aria-labelledby="subscription-locked-title">
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <LockIcon className="size-5" />
              </div>
              <CardTitle id="subscription-locked-title">{school?.name ?? 'Your school'}'s Educa subscription has ended</CardTitle>
              <CardDescription>
                {subscription.paid_until ? `It ended on ${formatDate(subscription.paid_until)}. ` : ''}
                Marking, mark lists and report cards are locked until your school administrator renews it. Nothing has been deleted: your marks are kept.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}
    </div>
  )
}

/** A layout route: everything under it is locked while the subscription has lapsed. */
export function SubscriptionLockedRoutes() {
  return (
    <SubscriptionLock>
      <Outlet />
    </SubscriptionLock>
  )
}

/** Under the header, only when it matters to staff: lapsed, or ending within a week. */
export function SubscriptionBanner() {
  const subscription = useSubscription()

  if (!subscription) return null

  const overdue = subscription.status === 'overdue'
  if (!overdue && subscription.days_left > 7) return null

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-1.5 px-3 py-1 text-xs',
        overdue ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
      )}
      role={overdue ? 'alert' : 'status'}
    >
      <AlertTriangleIcon className="size-3.5" />
      {overdue
        ? 'Your school’s Educa subscription has ended. Marking and report cards are locked.'
        : `Your school’s Educa subscription ends ${subscription.days_left === 1 ? 'today' : `in ${subscription.days_left} days`}. Remind your administrator to renew it.`}
    </div>
  )
}
