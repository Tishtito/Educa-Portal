import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { DownloadIcon, FileTextIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/data/PageHeader'
import { EmptyState, QueryState } from '@/components/data/QueryState'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClassPicker } from '@/features/class/ClassPicker'
import { useMyClass } from '@/features/class/useMyClass'
import { downloadReportCardPdf, useReportCards, useReportEntries } from '@/features/exams/api'
import { hasFinalResults } from '@/features/exams/staffStatus'
import { useCurrentExam } from '@/features/exams/useCurrentExam'
import { errorMessage } from '@/lib/api/errors'
import type { Exam, ReportCard, ReportLayout } from '@/lib/api/types'
import { saveBlob } from '@/lib/download'
import { cn } from '@/lib/utils'
import { ClassPdfButton } from './ClassPdfButton'
import { EntriesEditor } from './EntriesEditor'
import { ReportCardView } from './ReportCardView'

/** The term layout puts a term's Mid-Term and End-Term side by side. */
const supportsTermLayout = (exam: Exam) => !!exam.term && (exam.exam_type === 'midterm' || exam.exam_type === 'endterm')

export function ReportCardsPage() {
  const { assignments, classes, current, setClassId } = useMyClass()
  const { exam, isPending } = useCurrentExam()
  const [params, setParams] = useSearchParams()
  const [entriesDirty, setEntriesDirty] = useState(false)

  if (assignments.isPending || isPending) return null
  if (!current) return <EmptyState icon={<FileTextIcon />} title="No class this year" description="Report cards are prepared by class teachers." />
  if (!exam) return <EmptyState icon={<FileTextIcon />} title="No exam yet" />

  const classId = current.class_id
  const inExam = !exam.classes || exam.classes.some((c) => c.id === classId)
  const final = hasFinalResults(exam.status)
  const termLayout = supportsTermLayout(exam)
  // Legacy printed End-Term cards with the term's Mid-Term beside them; keep that as the default.
  const requestedLayout = params.get('layout') ?? (exam.exam_type === 'endterm' ? 'term' : 'single')
  const layout: ReportLayout = termLayout && requestedLayout === 'term' ? 'term' : 'single'
  // Before results are final there is nothing to preview, so start on the remarks.
  const view = (params.get('view') ?? (final ? 'preview' : 'entries')) === 'entries' ? 'entries' : 'preview'

  const setParam = (key: string, value: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.set(key, value)
        return next
      },
      { replace: true },
    )

  return (
    <>
      <PageHeader
        eyebrow={exam.name}
        title={`${current.class_name} report cards`}
        actions={
          <>
            <ClassPicker classes={classes} value={classId} onChange={(id) => !entriesDirty && setClassId(id)} />
            {inExam && termLayout && (
              <Select value={layout} onValueChange={(v) => setParam('layout', v)}>
                <SelectTrigger className="w-52" aria-label="Report layout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">This exam only</SelectItem>
                  <SelectItem value="term">Whole term (Mid-Term + End-Term)</SelectItem>
                </SelectContent>
              </Select>
            )}
            {inExam && final && <ClassPdfButton examId={exam.id} classId={classId} layout={layout} filename={`${exam.name} ${current.class_name} report cards.pdf`} />}
          </>
        }
      />

      {!inExam ? (
        <EmptyState icon={<FileTextIcon />} title="Not in this exam" description={`${exam.name} does not include ${current.class_name}. Switch exam from the header.`} />
      ) : exam.status === 'draft' ? (
        <EmptyState icon={<FileTextIcon />} title="This exam is still being set up" />
      ) : (
        <Tabs value={view} onValueChange={(v) => !entriesDirty && setParam('view', v)}>
          <TabsList>
            <TabsTrigger value="entries">Remarks &amp; fees</TabsTrigger>
            <TabsTrigger value="preview" disabled={entriesDirty && view !== 'preview'}>
              Preview cards
            </TabsTrigger>
          </TabsList>
          {entriesDirty && <p className="mt-1 text-xs text-muted-foreground">Save or discard your remarks to switch views or class.</p>}

          <TabsContent value="entries" className="mt-4">
            <EntriesPanel key={`${exam.id}:${classId}`} examId={exam.id} classId={classId} onDirtyChange={setEntriesDirty} />
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            {final ? (
              <CardsPreview examId={exam.id} classId={classId} layout={layout} examName={exam.name} />
            ) : (
              <Alert>
                <AlertDescription>Report cards can be previewed once marking is locked. You can already type remarks and fee balances.</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      )}
    </>
  )
}

function EntriesPanel({ examId, classId, onDirtyChange }: { examId: number; classId: number; onDirtyChange: (dirty: boolean) => void }) {
  const entries = useReportEntries(examId, classId)
  return <QueryState query={entries}>{(data) => <EntriesEditor examId={examId} classId={classId} entries={data} onDirtyChange={onDirtyChange} />}</QueryState>
}

function CardsPreview({ examId, classId, layout, examName }: { examId: number; classId: number; layout: ReportLayout; examName: string }) {
  const cards = useReportCards(examId, classId, layout)
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <QueryState query={cards}>
      {(data) => {
        if (data.length === 0) return <EmptyState title="No report cards" description="No pupil in this class has results for this exam." />
        const current = data.find((c) => c.student.enrolment_id === selected) ?? data[0]

        return (
          <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
            {/* Phones: a picker. Larger screens: a list. */}
            <div className="lg:hidden">
              <Select value={String(current.student.enrolment_id)} onValueChange={(v) => setSelected(Number(v))}>
                <SelectTrigger className="w-full" aria-label="Pupil">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.map((card) => (
                    <SelectItem key={card.student.enrolment_id} value={String(card.student.enrolment_id)}>
                      {card.student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Card className="hidden max-h-[70vh] overflow-y-auto p-1 lg:block">
              <ul>
                {data.map((card) => (
                  <li key={card.student.enrolment_id}>
                    <button
                      type="button"
                      onClick={() => setSelected(card.student.enrolment_id)}
                      className={cn('w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted', card === current && 'bg-muted font-medium')}
                    >
                      <div className="truncate">{card.student.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {card.student.assessment_no} · mean {card.totals.at(-1)?.mean_marks ?? '—'}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="min-w-0">
              <div className="mb-2 flex justify-end">
                <SinglePdfButton examId={examId} card={current} layout={layout} examName={examName} />
              </div>
              <ReportCardView card={current} />
            </div>
          </div>
        )
      }}
    </QueryState>
  )
}

function SinglePdfButton({ examId, card, layout, examName }: { examId: number; card: ReportCard; layout: ReportLayout; examName: string }) {
  const [busy, setBusy] = useState(false)

  async function download() {
    setBusy(true)
    try {
      const { blob } = await downloadReportCardPdf(examId, card.student.enrolment_id, layout)
      await saveBlob(blob, `${card.student.name} ${examName}.pdf`)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void download()} disabled={busy}>
      {busy ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
      PDF
    </Button>
  )
}
