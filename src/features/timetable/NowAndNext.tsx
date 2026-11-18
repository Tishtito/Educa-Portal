import { useEffect, useState } from 'react'
import { ClockIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { Lesson } from './api'
import { DAY_NAMES, nowAndNext } from './week'

/** "Now: …  Next: …", refreshed every minute. */
export function NowAndNext({ lessons }: { lessons: Lesson[] }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const { current, next, nextIsToday } = nowAndNext(lessons, now)
  if (!current && !next) return null

  return (
    <Card>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Slot title="Now" lesson={current} empty="No lesson right now" />
        <Slot title={nextIsToday ? 'Next' : next ? `Next · ${DAY_NAMES[next.day]}` : 'Next'} lesson={next} empty="Nothing else this week" />
      </CardContent>
    </Card>
  )
}

function Slot({ title, lesson, empty }: { title: string; lesson: Lesson | null; empty: string }) {
  return (
    <div className="flex items-start gap-3">
      <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase">{title}</p>
        {lesson ? (
          <>
            <p className="truncate font-medium">
              {lesson.subject_name} · {lesson.class_name}
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {lesson.starts_at}–{lesson.ends_at}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </div>
  )
}
