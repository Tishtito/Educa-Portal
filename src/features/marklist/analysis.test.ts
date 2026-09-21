import { describe, expect, it } from 'vitest'
import type { Marklist, MarklistScore, MarklistStudent } from '@/lib/api/types'
import { bandCounts, compareMarklists } from './analysis'

const score = (level_subject_id: number, value: number | null, band: string | null, is_absent = false): MarklistScore => ({
  level_subject_id, score: value, raw_score: value, max_marks: 100, band, band_label: null, is_absent, subject_position: null,
})

const student = (student_id: number, mean: number | null, meanBand: string | null, scores: MarklistScore[]): MarklistStudent => ({
  student_id, assessment_no: `A${student_id}`, name: `Pupil ${student_id}`, total_marks: mean, mean_marks: mean, mean_band: meanBand, mean_band_label: null,
  grade_position: null, stream_position: null, grade_cohort_size: null, stream_cohort_size: null, is_complete: true,
  subjects_expected: scores.length, subjects_counted: scores.length, scores,
})

const list = (subjects: { id: number; code: string; mean: number | null }[], students: MarklistStudent[]): Marklist => ({
  exam: { id: 1, name: 'Exam', status: 'locked', tie_policy: 'competition', is_legacy_import: false, results_up_to_date: true, results_computed_at: null },
  class: { id: 3, name: 'Grade 5 Blue', grade: 'Grade 5', stream: 'Blue' },
  subjects: subjects.map((s) => ({
    level_subject_id: s.id, name: s.code, code: s.code, scale_max: 100, counts_toward_total: true, aggregation_rule: 'single', class_mean: s.mean, students_counted: 0,
  })),
  students,
})

describe('bandCounts', () => {
  const marklist = list(
    [{ id: 1, code: 'MAT', mean: null }, { id: 2, code: 'ENG', mean: null }],
    [
      student(1, 85, 'EE', [score(1, 90, 'EE'), score(2, 80, 'EE')]),
      student(2, 55, 'ME', [score(1, 60, 'ME'), score(2, 50, 'AE')]),
      student(3, 40, 'AE', [score(1, 45, 'AE'), score(2, null, null, true)]),
      student(4, 20, 'BE', [score(1, 58, 'ME'), score(2, 70, 'ME')]),
    ],
  )

  it('counts pupils per band for each subject and overall', () => {
    const counts = bandCounts(marklist)
    expect(Object.fromEntries(counts.bySubject.get(1)!)).toEqual({ EE: 1, ME: 2, AE: 1 })
    expect(Object.fromEntries(counts.bySubject.get(2)!)).toEqual({ EE: 1, AE: 1, ME: 1 })
    expect(counts.unbandedBySubject.get(2)).toBe(1)
    expect(Object.fromEntries(counts.overall)).toEqual({ EE: 1, ME: 1, AE: 1, BE: 1 })
  })

  it('orders bands best first, placing overall-only bands by mean mark', () => {
    expect(bandCounts(marklist).bands).toEqual(['EE', 'ME', 'AE', 'BE'])
  })
})

describe('compareMarklists', () => {
  it('reports subject, class and pupil changes against the earlier exam', () => {
    const current = list(
      [{ id: 1, code: 'MAT', mean: 62.5 }, { id: 2, code: 'ENG', mean: 70 }, { id: 3, code: 'SCI', mean: 50 }],
      [student(1, 70, null, []), student(2, 55.25, null, []), student(3, 40, null, [])],
    )
    const previous = list(
      // English was a different curriculum row last time but the same code; Science is new.
      [{ id: 1, code: 'MAT', mean: 60 }, { id: 9, code: 'ENG', mean: 72.75 }],
      [student(1, 65.5, null, []), student(2, 60, null, [])],
    )

    const result = compareMarklists(current, previous)

    expect(result.subjects.get(1)).toMatchObject({ previous: 60, change: 2.5 })
    expect(result.subjects.get(2)).toMatchObject({ previous: 72.75, change: -2.75 })
    expect(result.subjects.get(3)).toMatchObject({ previous: null, change: null })
    expect(result.classMean).toMatchObject({ current: 55.08, previous: 62.75, change: -7.67 })
    expect(result.pupils.get(1)).toBe(4.5)
    expect(result.pupils.get(2)).toBe(-4.75)
    expect(result.pupils.get(3)).toBeNull()
  })
})
