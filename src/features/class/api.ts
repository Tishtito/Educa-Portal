import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { ClassRoster, SchoolClass, Student, StudentResult } from '@/lib/api/types'
import { meKeys } from '@/features/me/api'

export const classKeys = {
  roster: (classId: number) => ['my', 'classes', classId, 'students'] as const,
  student: (studentId: number) => ['my', 'students', studentId] as const,
  results: (studentId: number) => ['my', 'students', studentId, 'results'] as const,
  activeClasses: ['reference', 'classes', { active: true }] as const,
}

export function useClassRoster(classId: number | null) {
  return useQuery({
    queryKey: classKeys.roster(classId ?? 0),
    queryFn: ({ signal }) => api.get<ClassRoster>(`/my/classes/${classId}/students`, { signal }),
    enabled: classId !== null,
  })
}

export function usePupil(studentId: number) {
  return useQuery({
    queryKey: classKeys.student(studentId),
    queryFn: ({ signal }) => api.get<Student>(`/my/students/${studentId}`, { signal }),
  })
}

export function usePupilResults(studentId: number) {
  return useQuery({
    queryKey: classKeys.results(studentId),
    queryFn: ({ signal }) => api.get<StudentResult[]>(`/my/students/${studentId}/results`, { signal }),
  })
}

/** Every active class in the school: where a pupil can be moved to. */
export function useActiveClasses() {
  return useQuery({
    queryKey: classKeys.activeClasses,
    queryFn: ({ signal }) => api.get<SchoolClass[]>('/classes', { query: { active: true }, signal }),
    staleTime: 5 * 60_000,
  })
}

export interface AdmitInput {
  assessment_no: string
  first_name: string
  middle_name: string | null
  last_name: string
  gender: Student['gender']
  date_of_birth: string | null
  guardian_name: string | null
  guardian_phone: string | null
  upi: string | null
}

export function useAdmitPupil(classId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AdmitInput) => api.post<Student>(`/my/classes/${classId}/students`, input),
    meta: { silent: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: classKeys.roster(classId) })
      void queryClient.invalidateQueries({ queryKey: meKeys.assignments })
    },
  })
}

export function useMovePupil() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, classId }: { studentId: number; classId: number }) =>
      api.post<Student>(`/my/students/${studentId}/move`, { class_id: classId }),
    onSuccess: () => {
      // Two rosters change and the pupil may have left this teacher's care.
      void queryClient.invalidateQueries({ queryKey: ['my'] })
      void queryClient.invalidateQueries({ queryKey: meKeys.assignments })
    },
  })
}
