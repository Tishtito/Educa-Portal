import { describe, expect, it } from 'vitest'
import type { Lesson } from './api'
import { isoDay, lessonsOn, nowAndNext, teacherRows } from './week'

const lesson = (over: Partial<Lesson>): Lesson => ({
  id: 1,
  class_id: 1,
  class_name: 'Grade 5 Blue',
  level_subject_id: 1,
  subject_name: 'Mathematics',
  subject_code: 'MAT',
  user_id: 1,
  teacher_name: 'Jane',
  day: 1,
  period_sequence: 1,
  starts_at: '08:00',
  ends_at: '08:35',
  is_locked: false,
  double_group: null,
  ...over,
})

// 2026-09-28 is a Monday.
const at = (day: number, time: string) => {
  const [h, m] = time.split(':').map(Number)
  return new Date(2026, 8, 27 + day, h, m)
}

const week = [
  lesson({ id: 1, day: 1, starts_at: '08:00', ends_at: '08:35' }),
  lesson({ id: 2, day: 1, starts_at: '10:00', ends_at: '10:35' }),
  lesson({ id: 3, day: 3, starts_at: '09:00', ends_at: '09:35' }),
]

describe('isoDay', () => {
  it('numbers Monday 1 and Sunday 7', () => {
    expect(isoDay(at(1, '09:00'))).toBe(1)
    expect(isoDay(at(7, '09:00'))).toBe(7)
  })
})

describe('nowAndNext', () => {
  it('finds the lesson under way and the next one today', () => {
    const result = nowAndNext(week, at(1, '08:10'))
    expect(result.current?.id).toBe(1)
    expect(result.next?.id).toBe(2)
    expect(result.nextIsToday).toBe(true)
  })

  it('looks ahead to a later day after the last lesson today', () => {
    const result = nowAndNext(week, at(1, '11:00'))
    expect(result.current).toBeNull()
    expect(result.next?.id).toBe(3)
    expect(result.nextIsToday).toBe(false)
  })

  it('wraps to next week after the week’s last lesson', () => {
    expect(nowAndNext(week, at(5, '12:00')).next?.id).toBe(1)
  })

  it('has nothing to say without lessons', () => {
    expect(nowAndNext([], at(1, '08:00'))).toEqual({ current: null, next: null, nextIsToday: false })
  })
})

describe('lessonsOn and teacherRows', () => {
  it('orders a day by time and groups a week by distinct times', () => {
    expect(lessonsOn(week, 1).map((l) => l.id)).toEqual([1, 2])
    expect(teacherRows(week).map((r) => r.starts_at)).toEqual(['08:00', '09:00', '10:00'])
  })
})
