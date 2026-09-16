import { useMyExams, useSelectExam, useSelectedExamPreference } from '@/features/me/api'
import { pickCurrentExam } from './currentExam'

/** The exam every tab works on, and a way to switch it (remembered across devices). */
export function useCurrentExam() {
  const exams = useMyExams()
  const preference = useSelectedExamPreference()
  const select = useSelectExam()

  const exam = exams.data ? pickCurrentExam(exams.data, select.variables ?? preference.data?.id) : null

  return {
    exam,
    exams: exams.data ?? [],
    isPending: exams.isPending || preference.isPending,
    error: exams.error,
    refetch: exams.refetch,
    switchTo: (examId: number) => select.mutate(examId),
  }
}
