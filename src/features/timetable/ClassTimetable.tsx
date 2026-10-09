import { CalendarRangeIcon, PrinterIcon } from 'lucide-react'
import { EmptyState, QueryState } from '@/components/data/QueryState'
import { Button } from '@/components/ui/button'
import { useClassTimetable } from './api'
import { WeekGrid } from './WeekGrid'
import { classRows, isoDay } from './week'

/** The week of a class the signed-in teacher is class teacher of. */
export function ClassTimetable({ classId }: { classId: number }) {
  const timetable = useClassTimetable(classId)

  return (
    <QueryState query={timetable}>
      {(data) =>
        data === null ? (
          <EmptyState icon={<CalendarRangeIcon />} title="No timetable yet" description="The class’s timetable appears here once the school publishes one." />
        ) : (
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {data.timetable.name} · {data.lessons.length} lessons a week
              </p>
              <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
                <PrinterIcon /> Print
              </Button>
            </div>
            <h2 className="hidden text-lg font-semibold print:block">{data.class.name}</h2>
            <WeekGrid days={data.schedule.days} rows={classRows(data.schedule.periods, data.lessons)} show="teacher" today={isoDay(new Date())} />
          </div>
        )
      }
    </QueryState>
  )
}
