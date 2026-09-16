import { Link } from 'react-router'
import { ArrowRightIcon, ClipboardPenIcon, FileTextIcon, ListOrderedIcon, UsersIcon } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { EmptyState, ErrorPanel } from '@/components/data/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useReportEntries } from '@/features/exams/api'
import { ExamStatusBadge } from '@/features/exams/ExamStatusBadge'
import { hasFinalResults, staffStatusText } from '@/features/exams/staffStatus'
import { useCurrentExam } from '@/features/exams/useCurrentExam'
import { useMyAssignments } from '@/features/me/api'
import type { MyAssignments, MyExam } from '@/lib/api/types'
import { formatDate } from '@/lib/format'

export function HomePage() {
  const { user, school, isClassTeacher, isExaminer } = useAuth()
  const { exam, isPending, error, refetch } = useCurrentExam()
  const assignments = useMyAssignments()
  const duties = assignments.data && assignments.data.class_teacher_of.length + assignments.data.examiner_of.length

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-sm text-muted-foreground">{school?.name}</p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Hello{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
      </div>

      {isPending ? (
        <Skeleton className="h-28" />
      ) : error ? (
        <ErrorPanel error={error} onRetry={() => void refetch()} />
      ) : exam ? (
        <Card>
          <CardHeader>
            <CardDescription>Current exam</CardDescription>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {exam.name} <ExamStatusBadge status={exam.status} />
            </CardTitle>
            <CardDescription>
              {[exam.academic_year?.name, exam.term?.name, exam.starts_on && `${formatDate(exam.starts_on)} – ${formatDate(exam.ends_on)}`]
                .filter(Boolean)
                .join(' · ')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">{staffStatusText[exam.status]}</CardContent>
        </Card>
      ) : (
        <EmptyState title="No exams yet" description="Exams for your classes appear here once the school creates them." />
      )}

      {assignments.data && duties === 0 && (
        <EmptyState
          icon={<UsersIcon />}
          title="You have no classes or subjects this year"
          description="Ask the school administrator to assign you as a class teacher or examiner."
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {isExaminer && exam && assignments.data && assignments.data.examiner_of.length > 0 && <MarkingCard exam={exam} assignments={assignments.data} />}
        {isClassTeacher &&
          assignments.data?.class_teacher_of.map((item) => <ClassCard key={item.class_id} exam={exam} classInfo={item} />)}
      </div>
    </div>
  )
}

function MarkingCard({ exam, assignments }: { exam: MyExam; assignments: MyAssignments }) {
  const { sheets, complete_sheets, marks_entered, marks_expected } = exam.my_progress
  const percent = marks_expected ? Math.round((marks_entered / marks_expected) * 100) : 0
  const classes = new Set(assignments.examiner_of.map((a) => a.class_name))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardPenIcon className="size-4" /> Marking
        </CardTitle>
        <CardDescription>
          {assignments.examiner_of.length} subject{assignments.examiner_of.length === 1 ? '' : 's'} in {[...classes].join(', ')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {sheets === 0 ? (
          <p className="text-sm text-muted-foreground">No marksheets for you in this exam yet.</p>
        ) : (
          <>
            <div className="flex justify-between text-sm">
              <span>
                {complete_sheets} of {sheets} sheets complete
              </span>
              <span className="tabular-nums text-muted-foreground">{percent}%</span>
            </div>
            <Progress value={percent} />
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild size="sm" variant={exam.status === 'marking' ? 'default' : 'outline'}>
          <Link to="/marking">
            {exam.status === 'marking' ? 'Enter marks' : 'View marksheets'} <ArrowRightIcon />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function ClassCard({ exam, classInfo }: { exam: MyExam | null; classInfo: MyAssignments['class_teacher_of'][number] }) {
  const inExam = !!exam?.classes?.some((c) => c.id === classInfo.class_id)
  const entries = useReportEntries(exam?.id ?? 0, inExam ? classInfo.class_id : null)
  const filled = entries.data?.students.filter((s) => s.class_teacher_remarks).length ?? 0
  const total = entries.data?.students.length ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UsersIcon className="size-4" /> {classInfo.class_name}
        </CardTitle>
        <CardDescription>
          Class teacher · {classInfo.pupils} pupil{classInfo.pupils === 1 ? '' : 's'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {exam && inExam ? (
          <>
            <div className="flex justify-between">
              <span>Report card remarks</span>
              <span className="tabular-nums text-muted-foreground">
                {filled}/{total}
              </span>
            </div>
            <Progress value={total ? (filled / total) * 100 : 0} />
          </>
        ) : (
          <p className="text-muted-foreground">{exam ? 'This class is not in the current exam.' : 'No exam selected.'}</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to={`/class?class=${classInfo.class_id}`}>
            <UsersIcon /> Pupils
          </Link>
        </Button>
        {exam && inExam && exam.status !== 'draft' && exam.status !== 'open' && (
          <Button asChild size="sm" variant="outline">
            <Link to={`/marklist?class=${classInfo.class_id}`}>
              <ListOrderedIcon /> Mark list
            </Link>
          </Button>
        )}
        {exam && inExam && hasFinalResults(exam.status) && (
          <Button asChild size="sm">
            <Link to={`/report-cards?class=${classInfo.class_id}`}>
              <FileTextIcon /> Report cards
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
