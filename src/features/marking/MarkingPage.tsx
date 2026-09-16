import { Link } from 'react-router'
import { CheckCircle2Icon, ChevronRightIcon, ClipboardPenIcon, EyeIcon } from 'lucide-react'
import { PageHeader } from '@/components/data/PageHeader'
import { EmptyState, QueryState } from '@/components/data/QueryState'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useMarking } from '@/features/exams/api'
import { staffStatusText } from '@/features/exams/staffStatus'
import { useCurrentExam } from '@/features/exams/useCurrentExam'
import type { MarkingSheet } from '@/lib/api/types'
import { cn } from '@/lib/utils'

export function MarkingPage() {
  const { exam, isPending } = useCurrentExam()
  const marking = useMarking(exam && exam.status !== 'draft' ? exam.id : 0)

  if (isPending) return null
  if (!exam) return <EmptyState icon={<ClipboardPenIcon />} title="No exam to mark" description="Exams for your classes appear once the school creates them." />

  return (
    <>
      <PageHeader title="Marking" description={exam.name} />
      {exam.status === 'draft' ? (
        <EmptyState title="This exam is still being set up" description={staffStatusText.draft} />
      ) : (
        <QueryState query={marking}>
          {(data) => {
            const mine = data.sheets.filter((s) => s.can_enter)
            if (mine.length === 0) {
              return <EmptyState title="No marksheets for you" description="You are not assigned to mark any subject in this exam’s classes." />
            }
            const byClass = new Map<string, MarkingSheet[]>()
            for (const sheet of mine) byClass.set(sheet.class_name, [...(byClass.get(sheet.class_name) ?? []), sheet])

            return (
              <div className="grid gap-4">
                {exam.status !== 'marking' && (
                  <Alert>
                    <AlertDescription>{staffStatusText[exam.status]} Sheets open read-only.</AlertDescription>
                  </Alert>
                )}
                {[...byClass.entries()].map(([className, sheets]) => (
                  <Card key={className}>
                    <CardHeader>
                      <CardTitle className="text-base">{className}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 sm:grid-cols-2">
                      {sheets.map((sheet) => (
                        <SheetLink key={sheet.level_subject_id} examId={exam.id} sheet={sheet} editable={exam.status === 'marking'} />
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          }}
        </QueryState>
      )}
    </>
  )
}

function SheetLink({ examId, sheet, editable }: { examId: number; sheet: MarkingSheet; editable: boolean }) {
  const percent = sheet.marks_expected ? Math.round((sheet.marks_entered / sheet.marks_expected) * 100) : 0
  const Icon = editable ? ClipboardPenIcon : EyeIcon

  return (
    <Link
      to={`/marking/${examId}/${sheet.class_id}/${sheet.level_subject_id}`}
      className={cn('flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50', sheet.is_complete && 'border-emerald-300 dark:border-emerald-900')}
    >
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{sheet.subject_name}</span>
          {sheet.is_complete && <CheckCircle2Icon className="size-3.5 text-emerald-600" aria-label="Complete" />}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <Progress value={percent} className="h-1.5" />
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {sheet.marks_entered}/{sheet.marks_expected}
          </span>
        </div>
        {sheet.papers.length > 1 && <div className="mt-1 truncate text-xs text-muted-foreground">{sheet.papers.map((p) => p.name).join(' · ')}</div>}
      </div>
      <ChevronRightIcon className="size-4 text-muted-foreground" />
    </Link>
  )
}
