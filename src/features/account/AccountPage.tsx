import { useTheme } from 'next-themes'
import { LogOutIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { PageHeader } from '@/components/data/PageHeader'
import { QueryState } from '@/components/data/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChangePasswordForm } from '@/features/auth/ChangePasswordForm'
import { SessionsCard } from '@/features/auth/SessionsCard'
import { useMyAssignments } from '@/features/me/api'
import { roleLabel } from '@/lib/format'

export function AccountPage() {
  const { user, school, logout } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const assignments = useMyAssignments()
  if (!user) return null

  return (
    <>
      <PageHeader title="Account" description={school?.name} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{user.name}</CardTitle>
            <CardDescription>@{user.username}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-1">
              {user.roles.map((role, i) => (
                <Badge key={role} variant="secondary">
                  {user.role_names?.[i] ?? roleLabel(role)}
                </Badge>
              ))}
            </div>
            <QueryState query={assignments}>
              {(data) => (
                <div className="grid gap-3 text-sm">
                  <div className="font-medium">This year{data.academic_year ? ` (${data.academic_year.name})` : ''}</div>
                  {data.class_teacher_of.length > 0 && (
                    <div>
                      <div className="text-muted-foreground">Class teacher of</div>
                      <div>{data.class_teacher_of.map((c) => c.class_name).join(', ')}</div>
                    </div>
                  )}
                  {data.examiner_of.length > 0 && (
                    <div>
                      <div className="text-muted-foreground">Marks</div>
                      <ul className="list-disc pl-5">
                        {Object.entries(
                          data.examiner_of.reduce<Record<string, string[]>>((acc, a) => {
                            acc[a.class_name] = [...(acc[a.class_name] ?? []), a.subject_name ?? '']
                            return acc
                          }, {}),
                        ).map(([className, subjects]) => (
                          <li key={className}>
                            {className}: {subjects.join(', ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.class_teacher_of.length === 0 && data.examiner_of.length === 0 && (
                    <div className="text-muted-foreground">No classes or subjects assigned.</div>
                  )}
                </div>
              )}
            </QueryState>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
                {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />} {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
              </Button>
              <Button variant="destructive" onClick={() => void logout()}>
                <LogOutIcon /> Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change password</CardTitle>
            <CardDescription>Your other devices are signed out.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <SessionsCard />
        </div>
      </div>
    </>
  )
}
