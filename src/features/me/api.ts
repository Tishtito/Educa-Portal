import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { Exam, MyAssignments, MyExam } from '@/lib/api/types'

export const meKeys = {
  assignments: ['me', 'assignments'] as const,
  exams: ['me', 'exams'] as const,
  selectedExam: ['me', 'selected-exam'] as const,
}

export function useMyAssignments() {
  return useQuery({
    queryKey: meKeys.assignments,
    queryFn: ({ signal }) => api.get<MyAssignments>('/me/assignments', { signal }),
    staleTime: 5 * 60_000,
  })
}

export function useMyExams() {
  return useQuery({
    queryKey: meKeys.exams,
    queryFn: ({ signal }) => api.get<MyExam[]>('/me/exams', { signal }),
  })
}

export function useSelectedExamPreference() {
  return useQuery({
    queryKey: meKeys.selectedExam,
    queryFn: ({ signal }) => api.get<Exam | null>('/me/selected-exam', { signal }),
    staleTime: Infinity,
  })
}

export function useSelectExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (examId: number) => api.put<Exam>('/me/selected-exam', { exam_id: examId }),
    onSuccess: (exam) => queryClient.setQueryData(meKeys.selectedExam, exam),
  })
}
