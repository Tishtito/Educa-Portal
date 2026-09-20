import { render, screen } from '@testing-library/react'
import { AuthContext, type AuthContextValue } from '@/auth/context'
import type { SubscriptionState, User } from '@/lib/api/types'
import { SubscriptionBanner, SubscriptionLock } from './SubscriptionLock'

const state = (overrides: Partial<SubscriptionState>): SubscriptionState => ({
  status: 'active',
  paid_until: '2026-12-31',
  days_left: 90,
  is_trial: false,
  cycle_months: 4,
  price_kes: 12000,
  credit_kes: 0,
  amount_due_kes: 12000,
  ...overrides,
})

function renderWith(subscription: SubscriptionState) {
  const auth = {
    user: { name: 'Teacher', permissions: [], school: { name: 'Hilltop', slug: 'hilltop', subscription } } as unknown as User,
    school: { name: 'Hilltop', slug: 'hilltop' },
    can: () => false,
  } as unknown as AuthContextValue

  return render(
    <AuthContext.Provider value={auth}>
      <SubscriptionBanner />
      <SubscriptionLock>
        <button type="button">Save marks</button>
      </SubscriptionLock>
    </AuthContext.Provider>,
  )
}

describe('SubscriptionLock (staff portal)', () => {
  it('leaves marking usable while the subscription is active', () => {
    renderWith(state({}))
    expect(screen.getByRole('button', { name: 'Save marks' })).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('locks marking once it has ended, and says the administrator renews it', () => {
    renderWith(state({ status: 'overdue', days_left: 0, paid_until: '2026-09-18' }))
    expect(screen.queryByRole('button', { name: 'Save marks' })).not.toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toHaveTextContent('until your school administrator renews it')
    expect(screen.getByRole('alert')).toHaveTextContent('Marking and report cards are locked')
  })

  it('warns in the last week', () => {
    renderWith(state({ days_left: 5 }))
    expect(screen.getByRole('status')).toHaveTextContent('ends in 5 days')
  })
})
