import { useState } from 'react'
import { CalendarRangeIcon, PrinterIcon } from 'lucide-react'
import { PageHeader } from '@/components/data/PageHeader'
import { EmptyState, QueryState } from '@/components/data/QueryState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { useMyTimetable, type Lesson } from './api'
import { NowAndNext } from './NowAndNext'
import { WeekGrid } from './WeekGrid'
import { dayShort, DAY_NAMES, isoDay, lessonsOn, subjectTone, teacherRows } from './week'

/**
 * My week. A grid on wide screens; one day at a time on a phone, opening on
 * today. Only ever the published timetable — drafts never reach staff.
 */
export function TimetablePage() {
  const timetable = useMyTimetable()
  const today = isoDay(new Date())

  return (
    <QueryState query={timetable}>
      {(data) =>
        data === null ? (
          <EmptyState icon={<CalendarRangeIcon />} title="No timetable yet" description="Your timetable appears here once the school publishes one." />
        ) : (
          <>
            <PageHeader
              eyebrow={[data.timetable.academic_year.name, data.timetable.term?.name].filter(Boolean).join(' · ')}
              title="My timetable"
              description={`${data.lessons.length} lessons a week${data.timetable.published_at ? ` · published ${formatDate(data.timetable.published_at)}` : ''}`}
              actions={
                <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
                  <PrinterIcon /> Print
                </Button>
              }
            />
            <h2 className="mb-2 hidden text-lg font-semibold print:block">{data.teacher.name}</h2>
            {data.lessons.length === 0 ? (
              <EmptyState title="You have no lessons in this timetable" description="If that is wrong, ask the school administrator to check your subject assignments." />
            ) : (
              <div className="grid gap-4">
                <div className="print:hidden">
                  <NowAndNext lessons={data.lessons} />
                </div>
                <div className="hidden md:block print:block">
                  <WeekGrid days={data.days} rows={teacherRows(data.lessons)} show="class" today={today} />
                </div>
                <div className="md:hidden print:hidden">
                  <DayList days={data.days} lessons={data.lessons} today={today} />
                </div>
              </div>
            )}
          </>
        )
      }
    </QueryState>
  )
}

function DayList({ days, lessons, today }: { days: number[]; lessons: Lesson[]; today: number }) {
  const [day, setDay] = useState(days.includes(today) ? today : days[0])
  const list = lessonsOn(lessons, day)

  return (
    <div className="grid gap-3">
      <Tabs value={String(day)} onValueChange={(v) => setDay(Number(v))}>
        <TabsList className="w-full">
          {days.map((d) => (
            <TabsTrigger key={d} value={String(d)} className={cn(d === today && 'font-semibold')}>
              {dayShort(d)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="text-sm text-muted-foreground">
        {DAY_NAMES[day]}
        {day === today ? ' · today' : ''} · {list.length} lesson{list.length === 1 ? '' : 's'}
      </p>
      {list.length === 0 ? (
        <EmptyState title="No lessons" />
      ) : (
        <Card className="gap-0 p-0">
          {list.map((lesson) => (
            <div key={lesson.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
              <div className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
                {lesson.starts_at}
                <br />
                {lesson.ends_at}
              </div>
              <div className={cn('h-10 w-1 shrink-0 rounded-full border', subjectTone(lesson.level_subject_id))} />
              <div className="min-w-0">
                <p className="truncate font-medium">{lesson.subject_name}</p>
                <p className="truncate text-sm text-muted-foreground">{lesson.class_name}</p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
