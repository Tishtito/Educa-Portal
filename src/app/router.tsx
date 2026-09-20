import { createBrowserRouter } from 'react-router'
import { GuestOnly, RequireAuth, RequirePermission } from '@/auth/guards'
import { AppShell } from '@/components/layout/AppShell'
import { SubscriptionLockedRoutes } from '@/features/subscription/SubscriptionLock'
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { NotFoundPage } from './NotFoundPage'
import { RouteError } from './RouteError'

/** Pages load on demand so the first paint (login) stays small. */
const page = <T extends Record<string, React.ComponentType>>(load: () => Promise<T>, name: keyof T) => ({
  lazy: async () => ({ Component: (await load())[name] }),
})

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/forgot-password', ...page(() => import('@/features/auth/ForgotPasswordPage'), 'ForgotPasswordPage') },
        ],
      },
      // Google's sign-in popup returns here on the web (lib/google.ts).
      { path: '/auth/google/callback', ...page(() => import('@/features/auth/GoogleCallbackPage'), 'GoogleCallbackPage') },
      // Emailed links. Not GuestOnly: a signed-in browser is asked to sign out first.
      { path: '/invite/:token', ...page(() => import('@/features/auth/AccountLinkPage'), 'InvitationPage') },
      { path: '/reset-password/:token', ...page(() => import('@/features/auth/AccountLinkPage'), 'ResetPasswordPage') },
      {
        element: <RequireAuth />,
        children: [
          { path: '/change-password', element: <ChangePasswordPage /> },
          {
            element: <AppShell />,
            children: [
              { path: '/', ...page(() => import('@/features/home/HomePage'), 'HomePage') },
              { path: '/account', ...page(() => import('@/features/account/AccountPage'), 'AccountPage') },
              {
                element: <RequirePermission permission="view_class_pupils" />,
                children: [
                  { path: '/class', ...page(() => import('@/features/class/ClassPage'), 'ClassPage') },
                  { path: '/class/students/:studentId', ...page(() => import('@/features/class/PupilPage'), 'PupilPage') },
                  // Marks lock with the subscription; the class's pupils do not.
                  {
                    element: <SubscriptionLockedRoutes />,
                    children: [{ path: '/class/marks/:examId/:classId/:levelSubjectId', ...page(() => import('@/features/marking/MarksheetPage'), 'MarksheetPage') }],
                  },
                ],
              },
              // Marking, mark lists and report cards lock while the school's subscription has lapsed.
              {
                element: <SubscriptionLockedRoutes />,
                children: [
                  {
                    element: <RequirePermission permission="enter_marks" />,
                    children: [
                      { path: '/marking', ...page(() => import('@/features/marking/MarkingPage'), 'MarkingPage') },
                      { path: '/marking/:examId/:classId/:levelSubjectId', ...page(() => import('@/features/marking/MarksheetPage'), 'MarksheetPage') },
                    ],
                  },
                  {
                    element: <RequirePermission permission="view_marklists" />,
                    children: [{ path: '/marklist', ...page(() => import('@/features/marklist/MarklistPage'), 'MarklistPage') }],
                  },
                  {
                    element: <RequirePermission permission={['view_report_cards', 'edit_report_entries']} />,
                    children: [{ path: '/report-cards', ...page(() => import('@/features/report-cards/ReportCardsPage'), 'ReportCardsPage') }],
                  },
                ],
              },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
