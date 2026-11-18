import type { BellPeriod, Lesson } from './api'

export const DAY_NAMES: Record<number, string> = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' }

export const dayShort = (day: number) => DAY_NAMES[day]?.slice(0, 3) ?? `Day ${day}`

/** ISO weekday (Monday 1 … Sunday 7), as the API numbers days. */
export const isoDay = (date: Date) => ((date.getDay() + 6) % 7) + 1

const minutesOf = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export interface WeekRow {
  key: string
  kind: BellPeriod['kind']
  label: string | null
  starts_at: string
  ends_at: string
  cells: Record<number, Lesson[]>
}

export function classRows(periods: BellPeriod[], lessons: Lesson[]): WeekRow[] {
  return periods.map((period) => ({
    key: `p${period.sequence}`,
    kind: period.kind,
    label: period.label,
    starts_at: period.starts_at,
    ends_at: period.ends_at,
    cells: groupByDay(lessons.filter((l) => l.period_sequence === period.sequence)),
  }))
}

/** A teacher's rows are distinct lesson times: their classes may follow different bells. */
export function teacherRows(lessons: Lesson[]): WeekRow[] {
  const times = new Map<string, { starts_at: string; ends_at: string }>()
  for (const lesson of lessons) times.set(`${lesson.starts_at}-${lesson.ends_at}`, { starts_at: lesson.starts_at, ends_at: lesson.ends_at })

  return [...times.entries()]
    .sort(([, a], [, b]) => a.starts_at.localeCompare(b.starts_at) || a.ends_at.localeCompare(b.ends_at))
    .map(([key, time]) => ({
      key,
      kind: 'lesson' as const,
      label: null,
      ...time,
      cells: groupByDay(lessons.filter((l) => l.starts_at === time.starts_at && l.ends_at === time.ends_at)),
    }))
}

function groupByDay(lessons: Lesson[]): Record<number, Lesson[]> {
  const cells: Record<number, Lesson[]> = {}
  for (const lesson of lessons) (cells[lesson.day] ??= []).push(lesson)
  return cells
}

/** One day's lessons in time order. */
export function lessonsOn(lessons: Lesson[], day: number): Lesson[] {
  return lessons.filter((l) => l.day === day).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

/**
 * The lesson under way now and the next one, from this moment on through the
 * week (wrapping to next week's first lesson after the last).
 */
export function nowAndNext(lessons: Lesson[], now: Date): { current: Lesson | null; next: Lesson | null; nextIsToday: boolean } {
  const today = isoDay(now)
  const minute = now.getHours() * 60 + now.getMinutes()
  const sorted = [...lessons].sort((a, b) => a.day - b.day || a.starts_at.localeCompare(b.starts_at))

  const current = sorted.find((l) => l.day === today && minutesOf(l.starts_at) <= minute && minute < minutesOf(l.ends_at)) ?? null
  const next =
    sorted.find((l) => (l.day === today && minutesOf(l.starts_at) > minute) || l.day > today) ?? sorted[0] ?? null

  return { current, next, nextIsToday: next !== null && next.day === today && minutesOf(next.starts_at) > minute }
}

export function subjectTone(levelSubjectId: number): string {
  const tones = [
    'bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-900',
    'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900',
    'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900',
    'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-900',
    'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900',
    'bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:border-teal-900',
    'bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-900',
    'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-900',
  ]
  return tones[levelSubjectId % tones.length]
}
