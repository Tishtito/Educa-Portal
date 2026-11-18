import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export interface BellPeriod {
  sequence: number
  kind: 'lesson' | 'break' | 'lunch'
  label: string | null
  starts_at: string
  ends_at: string
}

export interface Lesson {
  id: number
  class_id: number
  class_name: string | null
  level_subject_id: number
  subject_name: string | null
  subject_code: string | null
  user_id: number
  teacher_name: string | null
  day: number
  period_sequence: number
  starts_at: string
  ends_at: string
  is_locked: boolean
  double_group: number | null
}

export interface PublishedTimetable {
  id: number
  name: string
  academic_year: { id: number; name: string | null }
  term: { id: number; name: string } | null
  published_at: string | null
}

export interface MyWeek {
  timetable: PublishedTimetable
  teacher: { id: number; name: string }
  days: number[]
  lessons: Lesson[]
}

export interface ClassWeek {
  timetable: PublishedTimetable
  class: { id: number; name: string }
  schedule: { days: number[]; periods: BellPeriod[] }
  lessons: Lesson[]
}

export const timetableKeys = {
  mine: ['timetable', 'mine'] as const,
  forClass: (classId: number) => ['timetable', 'class', classId] as const,
}

/** My lessons in the published timetable; null until the school publishes one. */
export function useMyTimetable(enabled = true) {
  return useQuery({
    queryKey: timetableKeys.mine,
    queryFn: ({ signal }) => api.get<MyWeek | null>('/me/timetable', { signal }),
    staleTime: 5 * 60_000,
    enabled,
  })
}

export function useClassTimetable(classId: number | null) {
  return useQuery({
    queryKey: timetableKeys.forClass(classId ?? 0),
    queryFn: ({ signal }) => api.get<ClassWeek | null>(`/my/classes/${classId}/timetable`, { signal }),
    staleTime: 5 * 60_000,
    enabled: classId !== null,
  })
}
