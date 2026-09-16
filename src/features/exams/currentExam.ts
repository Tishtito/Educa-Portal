import type { MyExam } from '@/lib/api/types'

/**
 * The exam the portal works on when the user has not chosen one (or chose one
 * that no longer involves them): the one being marked now, else the most
 * recently finished, else the newest. Legacy made staff pick an exam on every
 * sign-in; the choice is now remembered on the server.
 */
export function pickCurrentExam(exams: MyExam[], selectedId: number | null | undefined): MyExam | null {
  if (exams.length === 0) return null
  const selected = exams.find((exam) => exam.id === selectedId)
  if (selected) return selected

  return (
    exams.find((exam) => exam.status === 'marking') ??
    exams.find((exam) => exam.status === 'locked' || exam.status === 'published') ??
    exams.find((exam) => exam.status === 'open') ??
    exams[0]
  )
}
