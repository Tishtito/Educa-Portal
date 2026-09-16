import { Fragment, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowRightLeftIcon, ChevronDownIcon, ChevronLeftIcon } from 'lucide-react'
import { EmptyState, QueryState } from '@/components/data/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMyAssignments } from '@/features/me/api'
import type { Student, StudentResult } from '@/lib/api/types'
import { formatDate, formatScore } from '@/lib/format'
import { cn } from '@/lib/utils'
import { usePupil, usePupilResults } from './api'
import { MovePupilDialog } from './MovePupilDialog'

export function PupilPage() {
  const id = Number(useParams().studentId)
  const pupil = usePupil(id)

  return (
    <>
      <Link to="/class" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeftIcon className="size-3.5" /> My class
      </Link>
      <QueryState query={pupil}>{(data) => <Profile pupil={data} />}</QueryState>
    </>
  )
}

function Profile({ pupil }: { pupil: Student }) {
  const navigate = useNavigate()
  const assignments = useMyAssignments()
  const [moving, setMoving] = useState(false)
  const yearId = assignments.data?.academic_year?.id
  const current = pupil.enrolments?.find((e) => e.academic_year_id === yearId && e.status === 'active')
  // Past pupils stay readable; only a pupil in one of my classes now can be moved.
  const inMyClass = !!current && !!assignments.data?.class_teacher_of.some((c) => c.class_id === current.class_id)

  const details: [string, string | null][] = [
    ['Admission no.', pupil.admission_no],
    ['UPI', pupil.upi],
    ['Gender', pupil.gender ? pupil.gender[0].toUpperCase() + pupil.gender.slice(1) : null],
    ['Date of birth', pupil.date_of_birth ? formatDate(pupil.date_of_birth) : null],
    ['Guardian', pupil.guardian_name],
    ['Guardian phone', pupil.guardian_phone],
  ]

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{pupil.full_name}</h1>
          <p className="text-sm text-muted-foreground">{current ? `${current.class_name} · ${current.academic_year}` : 'Not in a class this year'}</p>
        </div>
        {inMyClass && (
          <Button variant="outline" onClick={() => setMoving(true)}>
            <ArrowRightLeftIcon /> Move class
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
              <CardDescription>Corrections go through the school office.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 text-sm">
                {details.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[7.5rem_1fr] gap-2">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 break-words">
                      {label === 'Guardian phone' && value ? (
                        <a href={`tel:${value}`} className="underline">
                          {value}
                        </a>
                      ) : (
                        value || '—'
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classes by year</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm">
                {pupil.enrolments?.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="font-medium">{e.academic_year}</span> · {e.class_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {e.status === 'active' ? '' : e.status === 'promoted' ? 'moved up' : `left ${formatDate(e.ended_on)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <ResultsCard studentId={pupil.id} />
      </div>

      {moving && current && (
        <MovePupilDialog open onOpenChange={setMoving} pupil={pupil} currentClassId={current.class_id} onMoved={() => navigate(`/class?class=${current.class_id}`, { replace: true })} />
      )}
    </>
  )
}

function ResultsCard({ studentId }: { studentId: number }) {
  const results = usePupilResults(studentId)
  const [open, setOpen] = useState<number | null>(null)

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle className="text-base">Results</CardTitle>
        <CardDescription>Every exam with final results. Select a row to see subjects.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <QueryState query={results}>
          {(data) =>
            data.length === 0 ? (
              <EmptyState title="No results yet" description="Results appear once an exam this pupil sat is locked." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Mean</TableHead>
                    <TableHead className="text-right">Position</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((result) => (
                    <ResultRows key={result.exam.id} result={result} open={open === result.exam.id} onToggle={() => setOpen(open === result.exam.id ? null : result.exam.id)} />
                  ))}
                </TableBody>
              </Table>
            )
          }
        </QueryState>
      </CardContent>
    </Card>
  )
}

function ResultRows({ result, open, onToggle }: { result: StudentResult; open: boolean; onToggle: () => void }) {
  return (
    <Fragment>
      <TableRow className="cursor-pointer" onClick={onToggle} aria-expanded={open}>
        <TableCell>
          <div className="font-medium">{result.exam.name}</div>
          <div className="text-xs text-muted-foreground">{[result.exam.academic_year, result.exam.term].filter(Boolean).join(' · ')}</div>
        </TableCell>
        <TableCell>{result.class_name}</TableCell>
        <TableCell className="text-right tabular-nums">{formatScore(result.total_marks)}</TableCell>
        <TableCell className="text-right tabular-nums">
          {formatScore(result.mean_marks)} {result.mean_band && <span className="text-xs text-muted-foreground">{result.mean_band}</span>}
        </TableCell>
        <TableCell className="text-right whitespace-nowrap tabular-nums">{result.grade_position ? `${result.grade_position}/${result.grade_cohort_size}` : '—'}</TableCell>
        <TableCell>
          <ChevronDownIcon className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={6}>
            <div className="grid gap-x-6 gap-y-1 py-1 text-sm sm:grid-cols-2">
              {result.subjects.map((s) => (
                <div key={s.level_subject_id} className="flex justify-between gap-2">
                  <span>{s.name}</span>
                  <span className="tabular-nums">
                    {s.is_absent ? 'Absent' : formatScore(s.score)} {s.band && <span className="text-xs text-muted-foreground">{s.band}</span>}
                  </span>
                </div>
              ))}
              {!result.is_complete && <p className="text-xs text-muted-foreground sm:col-span-2">Not every subject was marked for this exam.</p>}
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}
