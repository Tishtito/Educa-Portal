import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, requestBlob, requestEnvelope } from '@/lib/api/client'
import { meKeys } from '@/features/me/api'
import type {
  MarkInput,
  Marklist,
  Marksheet,
  MarkingOverview,
  ReportCard,
  ReportCardBatch,
  ReportEntries,
  ReportLayout,
  SaveMarksResult,
} from '@/lib/api/types'

export const examKeys = {
  /** Everything derived from one exam's marks: sheets, mark lists, cards. */
  results: (id: number) => ['exams', 'results', id] as const,
  marking: (id: number) => ['exams', 'results', id, 'marking'] as const,
  marksheet: (id: number, classId: number, levelSubjectId: number) =>
    ['exams', 'results', id, 'marksheet', classId, levelSubjectId] as const,
  marklist: (id: number, classId: number) => ['exams', 'results', id, 'marklist', classId] as const,
  reportCards: (id: number, classId: number, layout: ReportLayout) =>
    ['exams', 'results', id, 'report-cards', classId, layout] as const,
  reportEntries: (id: number, classId: number) => ['exams', 'results', id, 'report-entries', classId] as const,
  batch: (batchId: number) => ['report-card-batches', batchId] as const,
}

// -------------------------------------------------------------- marking

export function useMarking(examId: number) {
  return useQuery({
    queryKey: examKeys.marking(examId),
    queryFn: ({ signal }) => api.get<MarkingOverview>(`/exams/${examId}/marking`, { signal }),
    enabled: examId > 0,
  })
}

export function useMarksheet(examId: number, classId: number, levelSubjectId: number) {
  return useQuery({
    queryKey: examKeys.marksheet(examId, classId, levelSubjectId),
    queryFn: ({ signal }) =>
      api.get<Marksheet>(`/exams/${examId}/marksheet`, {
        query: { class_id: classId, level_subject_id: levelSubjectId },
        signal,
      }),
    // Never refetch a sheet under someone who is typing marks into it.
    refetchOnWindowFocus: false,
  })
}

export function useSaveMarksheet(examId: number, classId: number, levelSubjectId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (marks: MarkInput[]) =>
      requestEnvelope<SaveMarksResult>('PUT', `/exams/${examId}/marksheet`, {
        body: { class_id: classId, level_subject_id: levelSubjectId, marks },
      }),
    meta: { silent: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meKeys.exams })
      void queryClient.invalidateQueries({ queryKey: examKeys.results(examId) })
    },
  })
}

export interface SetMaxMarksInput {
  subject_paper_id: number
  class_id: number | null
  max_marks: number
  apply_to_existing?: boolean
}

export function useSetMaxMarks(examId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SetMaxMarksInput) =>
      api.put<{ max_marks: number; updated_marks: number }>(`/exams/${examId}/max-marks`, input),
    meta: { silent: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meKeys.exams })
      void queryClient.invalidateQueries({ queryKey: examKeys.results(examId) })
    },
  })
}

// ------------------------------------------------------------- marklist

export function useMarklist(examId: number, classId: number | null) {
  return useQuery({
    queryKey: examKeys.marklist(examId, classId ?? 0),
    queryFn: ({ signal }) => api.get<Marklist>(`/exams/${examId}/marklist`, { query: { class_id: classId }, signal }),
    enabled: classId !== null,
    // Saved marks are recomputed on the queue; follow along until results catch up.
    refetchInterval: (query) => (query.state.data && !query.state.data.exam.results_up_to_date ? 5000 : false),
  })
}

// --------------------------------------------------------- report cards

export function useReportCards(examId: number, classId: number | null, layout: ReportLayout, enabled = true) {
  return useQuery({
    queryKey: examKeys.reportCards(examId, classId ?? 0, layout),
    queryFn: ({ signal }) =>
      api.get<ReportCard[]>(`/exams/${examId}/report-cards`, { query: { class_id: classId, layout }, signal }),
    enabled: enabled && classId !== null,
  })
}

export function useReportEntries(examId: number, classId: number | null) {
  return useQuery({
    queryKey: examKeys.reportEntries(examId, classId ?? 0),
    queryFn: ({ signal }) =>
      api.get<ReportEntries>(`/exams/${examId}/report-entries`, { query: { class_id: classId }, signal }),
    enabled: classId !== null,
    refetchOnWindowFocus: false,
  })
}

export interface ReportEntryInput {
  enrolment_id: number
  class_teacher_remarks: string | null
  fee_balance: number | null
}

export function useSaveReportEntries(examId: number, classId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entries: ReportEntryInput[]) =>
      api.put<{ saved: number }>(`/exams/${examId}/report-entries`, { class_id: classId, entries }),
    meta: { silent: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: examKeys.reportEntries(examId, classId) })
      void queryClient.invalidateQueries({ queryKey: ['exams', 'results', examId, 'report-cards', classId] })
    },
  })
}

export function downloadReportCardPdf(examId: number, enrolmentId: number, layout: ReportLayout) {
  return requestBlob(`/exams/${examId}/report-cards/${enrolmentId}/pdf`, { query: { layout } })
}

export function useCreateReportBatch(examId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { class_id: number; layout: ReportLayout }) =>
      api.post<ReportCardBatch>(`/exams/${examId}/report-card-batches`, input),
    onSuccess: (batch) => queryClient.setQueryData(examKeys.batch(batch.id), batch),
  })
}

export function useReportBatch(batchId: number | null) {
  return useQuery({
    queryKey: examKeys.batch(batchId ?? 0),
    queryFn: ({ signal }) => api.get<ReportCardBatch>(`/report-card-batches/${batchId}`, { signal }),
    enabled: batchId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'completed' || status === 'failed' ? false : 2500
    },
  })
}

export function downloadReportBatch(batchId: number) {
  return requestBlob(`/report-card-batches/${batchId}/download`)
}
