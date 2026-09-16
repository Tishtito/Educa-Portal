import { useSearchParams } from 'react-router'
import { useMyAssignments } from '@/features/me/api'

/**
 * The class a class-teacher page is about: `?class=` when it is one of theirs,
 * otherwise their primary (or first) class this year.
 */
export function useMyClass() {
  const assignments = useMyAssignments()
  const [params, setParams] = useSearchParams()
  const classes = assignments.data?.class_teacher_of ?? []
  const requested = Number(params.get('class'))
  const current = classes.find((c) => c.class_id === requested) ?? classes.find((c) => c.is_primary) ?? classes[0] ?? null

  const setClassId = (classId: number) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.set('class', String(classId))
        return next
      },
      { replace: true },
    )

  return { assignments, classes, current, setClassId }
}
