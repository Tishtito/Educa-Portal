import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { ExamStatusBadge } from './ExamStatusBadge'
import { useCurrentExam } from './useCurrentExam'

/** Legacy "Switch Exam", kept one tap away in the header. */
export function ExamSwitcher() {
  const { exam, exams, switchTo, isPending } = useCurrentExam()
  const [open, setOpen] = useState(false)

  if (isPending) return <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
  if (!exam) return <span className="text-sm text-muted-foreground">No exams yet</span>

  return (
    <>
      <Button variant="outline" size="sm" className="min-w-0 max-w-[62vw] justify-between gap-2" onClick={() => setOpen(true)} aria-label="Switch exam">
        <span className="truncate">{exam.name}</span>
        <ExamStatusBadge status={exam.status} className="hidden sm:inline-flex" />
        <ChevronsUpDownIcon className="opacity-50" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch exam</DialogTitle>
            <DialogDescription>Exams that include a class you teach or mark.</DialogDescription>
          </DialogHeader>
          <ul className="-mx-2 grid max-h-[60dvh] gap-1 overflow-y-auto">
            {exams.map((item) => {
              const { marks_entered, marks_expected } = item.my_progress
              const percent = marks_expected ? Math.round((marks_entered / marks_expected) * 100) : 0
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn('grid w-full gap-1 rounded-lg px-3 py-2 text-left hover:bg-muted', item.id === exam.id && 'bg-muted')}
                    onClick={() => {
                      switchTo(item.id)
                      setOpen(false)
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                      <ExamStatusBadge status={item.status} />
                      {item.id === exam.id && <CheckIcon className="size-4" />}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="shrink-0">{[item.academic_year?.name, item.term?.name].filter(Boolean).join(' · ')}</span>
                      {marks_expected > 0 && (
                        <>
                          <Progress value={percent} className="h-1" />
                          <span className="shrink-0 tabular-nums">{percent}%</span>
                        </>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
