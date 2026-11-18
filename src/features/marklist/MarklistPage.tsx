import { useSearchParams } from 'react-router'
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, ListOrderedIcon, PrinterIcon } from 'lucide-react'
import { PageHeader } from '@/components/data/PageHeader'
import { EmptyState, QueryState } from '@/components/data/QueryState'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClassPicker } from '@/features/class/ClassPicker'
import { useMyClass } from '@/features/class/useMyClass'
import { useMarklist } from '@/features/exams/api'
import { hasFinalResults } from '@/features/exams/staffStatus'
import { useCurrentExam } from '@/features/exams/useCurrentExam'
import type { Marklist, MyExam } from '@/lib/api/types'
import { saveBlob } from '@/lib/download'
import { formatScore } from '@/lib/format'
import { cn } from '@/lib/utils'
import { bandCounts, compareMarklists, type Comparison } from './analysis'
import { marklistToCsv } from './csv'

const NO_COMPARE = 'none'

export function MarklistPage() {
  const { assignments, classes, current, setClassId } = useMyClass()
  const { exam, exams, isPending } = useCurrentExam()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'rubric' ? 'rubric' : 'ranked'

  const classId = current?.class_id ?? null
  const inExam = !!exam && !!classId && (!exam.classes || exam.classes.some((c) => c.id === classId))
  const showable = !!exam && exam.status !== 'draft' && exam.status !== 'open' && inExam
  const marklist = useMarklist(exam?.id ?? 0, showable ? classId : null)

  // Earlier exams with results for this class, newest first (the API orders them).
  const comparable = exams.filter((e) => e.id !== exam?.id && hasFinalResults(e.status) && (!e.classes || e.classes.some((c) => c.id === classId)))
  const compareId = comparable.find((e) => String(e.id) === params.get('compare'))?.id ?? null
  const previous = useMarklist(compareId ?? 0, showable && compareId ? classId : null)

  const setParam = (key: string, value: string | null) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (value === null) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )

  if (assignments.isPending || isPending) return null
  if (!current) return <EmptyState icon={<ListOrderedIcon />} title="No class this year" description="Mark lists are for class teachers." />
  if (!exam) return <EmptyState icon={<ListOrderedIcon />} title="No exam yet" />

  const comparison = marklist.data && previous.data ? compareMarklists(marklist.data, previous.data) : null
  const compareName = comparable.find((e) => e.id === compareId)?.name

  return (
    <>
      <PageHeader
        eyebrow={exam.name}
        title={`${current.class_name} mark list`}
        actions={
          <>
            <ClassPicker classes={classes} value={current.class_id} onChange={setClassId} />
            {marklist.data && (
              <>
                <Button variant="outline" onClick={() => window.print()} className="print:hidden">
                  <PrinterIcon /> Print
                </Button>
                <Button
                  variant="outline"
                  className="print:hidden"
                  onClick={() =>
                    void saveBlob(new Blob(['﻿' + marklistToCsv(marklist.data)], { type: 'text/csv;charset=utf-8' }), `${exam.name} ${marklist.data.class.name} mark list.csv`)
                  }
                >
                  <DownloadIcon /> CSV
                </Button>
              </>
            )}
          </>
        }
      />

      {!showable ? (
        <EmptyState
          icon={<ListOrderedIcon />}
          title={inExam ? 'No results yet' : 'Not in this exam'}
          description={inExam ? 'Mark lists appear once marking has started.' : `${exam.name} does not include ${current.class_name}. Switch exam from the header.`}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
            <Tabs value={view} onValueChange={(v) => setParam('view', v)}>
              <TabsList>
                <TabsTrigger value="ranked">Ranked</TabsTrigger>
                <TabsTrigger value="rubric">Rubric</TabsTrigger>
              </TabsList>
            </Tabs>
            {view === 'ranked' && (
              <Select value={compareId ? String(compareId) : NO_COMPARE} onValueChange={(v) => setParam('compare', v === NO_COMPARE ? null : v)}>
                <SelectTrigger className="w-auto max-w-full min-w-44" aria-label="Compare with">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COMPARE}>No comparison</SelectItem>
                  {comparable.map((e: MyExam) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      Compare with {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {!hasFinalResults(exam.status) && (
            <Alert className="mb-4 print:hidden">
              <AlertDescription>Marking is still open. These results are provisional and change as marks are entered.</AlertDescription>
            </Alert>
          )}

          <QueryState query={marklist}>
            {(data) =>
              data.students.length === 0 ? (
                <EmptyState title="No results for this class" description="Results appear after marks are entered and computed." />
              ) : view === 'rubric' ? (
                <RubricView marklist={data} examName={exam.name} />
              ) : (
                <>
                  {compareId && previous.isPending && <p className="mb-2 text-xs text-muted-foreground">Loading {compareName}…</p>}
                  {compareId && previous.isError && <p className="mb-2 text-xs text-destructive">Could not load {compareName} for comparison.</p>}
                  <RankedTable marklist={data} examName={exam.name} comparison={comparison} compareName={compareName} />
                </>
              )
            }
          </QueryState>
        </>
      )}
    </>
  )
}

// ----------------------------------------------------------------- ranked

function Change({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
  if (value === 0) return <span className="text-muted-foreground">0</span>
  const up = value > 0
  return (
    <span className={cn('inline-flex items-center gap-0.5', up ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
      {up ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
      {formatScore(Math.abs(value))}
    </span>
  )
}

function RankedTable({ marklist, examName, comparison, compareName }: { marklist: Marklist; examName: string; comparison: Comparison | null; compareName?: string }) {
  const cohort = marklist.students.find((s) => s.grade_cohort_size)?.grade_cohort_size

  return (
    <>
      <h2 className="mb-3 hidden text-lg font-semibold print:block">
        {examName} — {marklist.class.name}
      </h2>
      <Card className="overflow-x-auto p-0 print:border-0 print:shadow-none">
        <table className="w-full min-w-max text-sm print:text-[10px]">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-2 py-2 text-right font-medium" title={`Position in ${marklist.class.grade ?? 'grade'}`}>
                Pos
              </th>
              <th className="px-2 py-2 text-right font-medium" title="Position in stream">
                Str
              </th>
              <th className="sticky left-0 z-10 bg-muted px-3 py-2 font-medium print:static print:bg-transparent">Pupil</th>
              {marklist.subjects.map((subject) => (
                <th key={subject.level_subject_id} className="px-2 py-2 text-right font-medium" title={subject.name}>
                  {subject.code || subject.name}
                  {!subject.counts_toward_total && <span className="text-muted-foreground">*</span>}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-medium">Total</th>
              <th className="px-2 py-2 text-right font-medium">Mean</th>
              <th className="px-2 py-2 font-medium">Level</th>
              {comparison && (
                <th className="px-2 py-2 text-right font-medium" title={`Change in mean since ${compareName}`}>
                  ±Mean
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {marklist.students.map((student) => (
              <tr key={student.student_id} className="border-b hover:bg-muted/30">
                <td className="px-2 py-1.5 text-right tabular-nums">{student.grade_position ?? '—'}</td>
                <td className="px-2 py-1.5 text-right text-muted-foreground tabular-nums">{student.stream_position ?? '—'}</td>
                <td className="sticky left-0 z-10 max-w-56 bg-card px-3 py-1.5 print:static">
                  <div className="truncate font-medium">{student.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {student.assessment_no}
                    {!student.is_complete && ` · ${student.subjects_counted}/${student.subjects_expected} subjects`}
                  </div>
                </td>
                {marklist.subjects.map((subject) => {
                  const score = student.scores.find((s) => s.level_subject_id === subject.level_subject_id)
                  return (
                    <td key={subject.level_subject_id} className="px-2 py-1.5 text-right tabular-nums" title={score?.band_label ?? undefined}>
                      {score?.is_absent ? (
                        <span className="text-xs text-muted-foreground">ABS</span>
                      ) : (
                        <>
                          {formatScore(score?.score)}
                          {score?.band && <div className="text-[10px] text-muted-foreground">{score.band}</div>}
                        </>
                      )}
                    </td>
                  )
                })}
                <td className="px-2 py-1.5 text-right font-medium tabular-nums">{formatScore(student.total_marks)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatScore(student.mean_marks)}</td>
                <td className={cn('px-2 py-1.5 text-xs', !student.mean_band && 'text-muted-foreground')} title={student.mean_band_label ?? undefined}>
                  {student.mean_band ?? '—'}
                </td>
                {comparison && (
                  <td className="px-2 py-1.5 text-right text-xs tabular-nums">
                    <Change value={comparison.pupils.get(student.student_id)} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/40">
            <tr>
              <td colSpan={2} />
              <td className="sticky left-0 z-10 bg-muted px-3 py-2 font-medium print:static print:bg-transparent">Class mean</td>
              {marklist.subjects.map((subject) => (
                <td key={subject.level_subject_id} className="px-2 py-2 text-right font-medium tabular-nums">
                  {formatScore(subject.class_mean)}
                </td>
              ))}
              <td />
              <td className="px-2 py-2 text-right font-medium tabular-nums">{comparison && formatScore(comparison.classMean.current)}</td>
              <td colSpan={comparison ? 2 : 1} />
            </tr>
            {comparison && (
              <>
                <tr>
                  <td colSpan={2} />
                  <td className="sticky left-0 z-10 bg-muted px-3 py-1.5 text-muted-foreground print:static print:bg-transparent">{compareName}</td>
                  {marklist.subjects.map((subject) => (
                    <td key={subject.level_subject_id} className="px-2 py-1.5 text-right text-muted-foreground tabular-nums">
                      {formatScore(comparison.subjects.get(subject.level_subject_id)?.previous)}
                    </td>
                  ))}
                  <td />
                  <td className="px-2 py-1.5 text-right text-muted-foreground tabular-nums">{formatScore(comparison.classMean.previous)}</td>
                  <td colSpan={2} />
                </tr>
                <tr>
                  <td colSpan={2} />
                  <td className="sticky left-0 z-10 bg-muted px-3 py-1.5 font-medium print:static print:bg-transparent">Change</td>
                  {marklist.subjects.map((subject) => (
                    <td key={subject.level_subject_id} className="px-2 py-1.5 text-right text-xs tabular-nums">
                      <Change value={comparison.subjects.get(subject.level_subject_id)?.change} />
                    </td>
                  ))}
                  <td />
                  <td className="px-2 py-1.5 text-right text-xs tabular-nums">
                    <Change value={comparison.classMean.change} />
                  </td>
                  <td colSpan={2} />
                </tr>
              </>
            )}
          </tfoot>
        </table>
      </Card>
      <p className="mt-2 text-xs text-muted-foreground">
        Pos is the position in {marklist.class.grade ?? 'the grade'}
        {cohort ? ` (of ${cohort})` : ''}; Str is the position within {marklist.class.name}.
        {marklist.subjects.some((s) => !s.counts_toward_total) && ' * does not count toward the total.'}
        {comparison && ` Changes compare each subject’s class mean, and each pupil’s mean, with ${compareName}.`}
      </p>
    </>
  )
}

// ----------------------------------------------------------------- rubric

function RubricView({ marklist, examName }: { marklist: Marklist; examName: string }) {
  const counts = bandCounts(marklist)
  const pupils = [...marklist.students].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="grid gap-4">
      <h2 className="hidden text-lg font-semibold print:block">
        {examName} — {marklist.class.name} rubric
      </h2>
      <Card className="overflow-x-auto p-0 print:border-0 print:shadow-none">
        <table className="w-full min-w-max text-sm print:text-[10px]">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="sticky left-0 z-10 bg-muted px-3 py-2 font-medium print:static print:bg-transparent">Pupil</th>
              {marklist.subjects.map((s) => (
                <th key={s.level_subject_id} className="px-2 py-2 text-center font-medium" title={s.name}>
                  {s.code || s.name}
                </th>
              ))}
              <th className="px-2 py-2 text-center font-medium">Overall</th>
            </tr>
          </thead>
          <tbody>
            {pupils.map((student) => (
              <tr key={student.student_id} className="border-b hover:bg-muted/30">
                <td className="sticky left-0 z-10 max-w-56 truncate bg-card px-3 py-1.5 font-medium print:static">{student.name}</td>
                {marklist.subjects.map((subject) => {
                  const score = student.scores.find((s) => s.level_subject_id === subject.level_subject_id)
                  return (
                    <td key={subject.level_subject_id} className="px-2 py-1.5 text-center" title={score?.band_label ?? undefined}>
                      {score?.is_absent ? <span className="text-xs text-muted-foreground">ABS</span> : (score?.band ?? <span className="text-muted-foreground">—</span>)}
                    </td>
                  )
                })}
                <td className="px-2 py-1.5 text-center font-medium" title={student.mean_band_label ?? undefined}>
                  {student.mean_band ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto p-0 print:break-inside-avoid print:border-0 print:shadow-none">
        <div className="px-3 pt-3 text-sm font-medium">Pupils per level</div>
        <table className="w-full min-w-max text-sm print:text-[10px]">
          <thead className="border-b text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Level</th>
              {marklist.subjects.map((s) => (
                <th key={s.level_subject_id} className="px-2 py-2 text-right font-medium" title={s.name}>
                  {s.code || s.name}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-medium">Overall</th>
            </tr>
          </thead>
          <tbody>
            {counts.bands.map((band) => (
              <tr key={band} className="border-b">
                <td className="px-3 py-1.5 font-medium">{band}</td>
                {marklist.subjects.map((s) => (
                  <td key={s.level_subject_id} className="px-2 py-1.5 text-right tabular-nums">
                    {counts.bySubject.get(s.level_subject_id)?.get(band) ?? 0}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right font-medium tabular-nums">{counts.overall.get(band) ?? 0}</td>
              </tr>
            ))}
            <tr className="text-muted-foreground">
              <td className="px-3 py-1.5">Absent or not marked</td>
              {marklist.subjects.map((s) => (
                <td key={s.level_subject_id} className="px-2 py-1.5 text-right tabular-nums">
                  {counts.unbandedBySubject.get(s.level_subject_id) ?? 0}
                </td>
              ))}
              <td className="px-2 py-1.5 text-right tabular-nums">{marklist.students.filter((s) => !s.mean_band).length}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
