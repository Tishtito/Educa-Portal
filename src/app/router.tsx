import { createBrowserRouter } from 'react-router'
import { GuestOnly, RequireAuth, RequireDuty } from '@/auth/guards'
import { AppShell } from '@/components/layout/AppShell'
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
                element: <RequireDuty duty="examiner" />,
                children: [
                  { path: '/marking', ...page(() => import('@/features/marking/MarkingPage'), 'MarkingPage') },
                  { path: '/marking/:examId/:classId/:levelSubjectId', ...page(() => import('@/features/marking/MarksheetPage'), 'MarksheetPage') },
                ],
              },
              {
                element: <RequireDuty duty="class_teacher" />,
                children: [
                  { path: '/class', ...page(() => import('@/features/class/ClassPage'), 'ClassPage') },
                  { path: '/class/students/:studentId', ...page(() => import('@/features/class/PupilPage'), 'PupilPage') },
                  { path: '/class/marks/:examId/:classId/:levelSubjectId', ...page(() => import('@/features/marking/MarksheetPage'), 'MarksheetPage') },
                  { path: '/marklist', ...page(() => import('@/features/marklist/MarklistPage'), 'MarklistPage') },
                  { path: '/report-cards', ...page(() => import('@/features/report-cards/ReportCardsPage'), 'ReportCardsPage') },
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
