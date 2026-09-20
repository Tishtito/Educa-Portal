import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRightLeftIcon, CheckCircle2Icon, ChevronRightIcon, EyeIcon, SearchIcon, UserPlusIcon, UsersIcon } from 'lucide-react'
import { PageHeader } from '@/components/data/PageHeader'
import { EmptyState, QueryState } from '@/components/data/QueryState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMarking } from '@/features/exams/api'
import { SubscriptionLock } from '@/features/subscription/SubscriptionLock'
import { useCurrentExam } from '@/features/exams/useCurrentExam'
import type { Student } from '@/lib/api/types'
import { AdmitPupilDialog } from './AdmitPupilDialog'
import { useClassRoster } from './api'
import { ClassPicker } from './ClassPicker'
import { MovePupilDialog } from './MovePupilDialog'
import { useMyClass } from './useMyClass'

export function ClassPage() {
  const { assignments, classes, current, setClassId } = useMyClass()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'marks' ? 'marks' : 'pupils'

  if (assignments.isPending) return null
  if (!current) {
    return <EmptyState icon={<UsersIcon />} title="No class this year" description="You are not a class teacher for any class in the current academic year." />
  }

  return (
    <>
      <PageHeader
        eyebrow={assignments.data?.academic_year?.name}
        title={current.class_name}
        description={`${current.pupils} ${current.pupils === 1 ? 'pupil' : 'pupils'}${current.is_primary ? '' : ' · assistant class teacher'}`}
        actions={<ClassPicker classes={classes} value={current.class_id} onChange={setClassId} />}
      />
      <Tabs
        value={view}
        onValueChange={(v) =>
          setParams(
            (p) => {
              const next = new URLSearchParams(p)
              next.set('view', v)
              return next
            },
            { replace: true },
          )
        }
      >
        <TabsList>
          <TabsTrigger value="pupils">Pupils</TabsTrigger>
          <TabsTrigger value="marks">Marks</TabsTrigger>
        </TabsList>
        <TabsContent value="pupils" className="mt-4">
          <Pupils key={current.class_id} classId={current.class_id} className={current.class_name} />
        </TabsContent>
        <TabsContent value="marks" className="mt-4">
          <SubscriptionLock>
            <Marks classId={current.class_id} />
          </SubscriptionLock>
        </TabsContent>
      </Tabs>
    </>
  )
}

// ----------------------------------------------------------------- pupils

function Pupils({ classId, className }: { classId: number; className: string }) {
  const roster = useClassRoster(classId)
  const [search, setSearch] = useState('')
  const [admitting, setAdmitting] = useState(false)
  const [moving, setMoving] = useState<Student | null>(null)

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <InputGroup className="max-w-xs flex-1">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput placeholder="Search name or admission no." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search pupils" />
        </InputGroup>
        <Button onClick={() => setAdmitting(true)} className="ml-auto">
          <UserPlusIcon /> Admit pupil
        </Button>
      </div>

      <QueryState query={roster}>
        {(data) => {
          const term = search.trim().toLowerCase()
          const pupils = term
            ? data.students.filter((s) => s.full_name.toLowerCase().includes(term) || s.admission_no.toLowerCase().includes(term))
            : data.students

          if (data.students.length === 0) {
            return <EmptyState icon={<UsersIcon />} title="No pupils in this class" description="Admit new pupils, or ask the school office to place existing pupils here." />
          }
          if (pupils.length === 0) return <EmptyState title="No pupil matches" description={`Nothing matches “${search}”.`} />

          return (
            <Card className="p-0">
              <ul className="divide-y">
                {pupils.map((pupil) => (
                  <li key={pupil.id} className="flex items-center gap-1 pr-2">
                    <Link to={`/class/students/${pupil.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 hover:bg-muted/40">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{pupil.full_name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {[pupil.admission_no, pupil.guardian_name, pupil.guardian_phone].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => setMoving(pupil)} aria-label={`Move ${pupil.full_name}`} title="Move to another class">
                      <ArrowRightLeftIcon />
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )
        }}
      </QueryState>

      {admitting && <AdmitPupilDialog open onOpenChange={setAdmitting} classId={classId} className={className} />}
      {moving && <MovePupilDialog open onOpenChange={(open) => !open && setMoving(null)} pupil={moving} currentClassId={classId} />}
    </>
  )
}

// ------------------------------------------------------------------ marks

function Marks({ classId }: { classId: number }) {
  const { exam, isPending } = useCurrentExam()
  const marking = useMarking(exam && exam.status !== 'draft' ? exam.id : 0)

  if (isPending) return null
  if (!exam) return <EmptyState title="No exam yet" description="Marks appear here once the school creates an exam for your class." />
  if (exam.status === 'draft') return <EmptyState title="This exam is still being set up" />
  if (exam.classes && !exam.classes.some((c) => c.id === classId)) {
    return <EmptyState title="Not in this exam" description={`${exam.name} does not include this class. Switch exam from the header.`} />
  }

  return (
    <QueryState query={marking}>
      {(data) => {
        const sheets = data.sheets.filter((s) => s.class_id === classId)
        if (sheets.length === 0) return <EmptyState title="No subjects" description="No subject in this exam applies to this class." />
        const done = sheets.filter((s) => s.is_complete).length

        return (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              {exam.name}: {done} of {sheets.length} subjects fully marked. Marks are entered by each subject’s examiner.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sheets.map((sheet) => {
                const percent = sheet.marks_expected ? Math.round((sheet.marks_entered / sheet.marks_expected) * 100) : 0
                return (
                  <Link
                    key={sheet.level_subject_id}
                    to={`/class/marks/${exam.id}/${classId}/${sheet.level_subject_id}`}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted/50"
                  >
                    <EyeIcon className="size-5 shrink-0 text-muted-foreground" />
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
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )
      }}
    </QueryState>
  )
}
