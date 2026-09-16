import type { Marklist } from '@/lib/api/types'

const round2 = (n: number) => Math.round(n * 100) / 100

export interface BandCounts {
  /** Band codes, best first (ordered by the average score of the pupils holding them). */
  bands: string[]
  /** level_subject_id → band → pupils. */
  bySubject: Map<number, Map<string, number>>
  /** Pupils per band of their overall mean. */
  overall: Map<string, number>
  /** Pupils sat but not banded (absent or no score), per subject. */
  unbandedBySubject: Map<number, number>
}

/**
 * The rubric summary legacy teachers called the points table: how many pupils
 * reached each performance band, per subject and overall.
 */
export function bandCounts(marklist: Marklist): BandCounts {
  const bySubject = new Map<number, Map<string, number>>()
  const unbandedBySubject = new Map<number, number>()
  const overall = new Map<string, number>()
  const scoreSums = new Map<string, { total: number; n: number }>()
  const meanSums = new Map<string, { total: number; n: number }>()

  const bump = <K,>(map: Map<K, number>, key: K) => map.set(key, (map.get(key) ?? 0) + 1)
  const remember = (sums: Map<string, { total: number; n: number }>, band: string, score: number | null) => {
    if (score === null) return
    const entry = sums.get(band) ?? { total: 0, n: 0 }
    entry.total += score
    entry.n += 1
    sums.set(band, entry)
  }

  for (const subject of marklist.subjects) {
    bySubject.set(subject.level_subject_id, new Map())
    unbandedBySubject.set(subject.level_subject_id, 0)
  }

  for (const student of marklist.students) {
    for (const score of student.scores) {
      const counts = bySubject.get(score.level_subject_id)
      if (!counts) continue
      if (score.band && !score.is_absent) {
        bump(counts, score.band)
        // Subject scores are on each subject's scale; compare as a percentage.
        const max = marklist.subjects.find((s) => s.level_subject_id === score.level_subject_id)?.scale_max || 100
        remember(scoreSums, score.band, score.score === null ? null : (score.score / max) * 100)
      } else {
        bump(unbandedBySubject, score.level_subject_id)
      }
    }
    if (student.mean_band) {
      bump(overall, student.mean_band)
      remember(meanSums, student.mean_band, student.mean_marks)
    }
  }

  // A band seen only as an overall mean is placed by the pupils' mean marks.
  const average = (band: string) => {
    const entry = scoreSums.get(band) ?? meanSums.get(band)
    return entry && entry.n ? entry.total / entry.n : -1
  }
  const bands = [...new Set([...scoreSums.keys(), ...overall.keys()])].sort((a, b) => average(b) - average(a) || a.localeCompare(b))

  return { bands, bySubject, overall, unbandedBySubject }
}

export interface SubjectComparison {
  level_subject_id: number
  current: number | null
  previous: number | null
  /** current − previous; null unless both exist. */
  change: number | null
}

export interface Comparison {
  subjects: Map<number, SubjectComparison>
  classMean: SubjectComparison
  /** student_id → change in the pupil's mean mark. */
  pupils: Map<number, number | null>
}

const change = (current: number | null, previous: number | null) => (current === null || previous === null ? null : round2(current - previous))

const classMean = (marklist: Marklist) => {
  const means = marklist.students.map((s) => s.mean_marks).filter((m): m is number => m !== null)
  return means.length ? round2(means.reduce((a, b) => a + b, 0) / means.length) : null
}

/**
 * Compares a class's mark list with the same class in an earlier exam:
 * subject means (matched by curriculum subject, falling back to its code),
 * the class mean, and each pupil's mean.
 */
export function compareMarklists(current: Marklist, previous: Marklist): Comparison {
  const subjects = new Map<number, SubjectComparison>()

  for (const subject of current.subjects) {
    const match =
      previous.subjects.find((s) => s.level_subject_id === subject.level_subject_id) ??
      (subject.code ? previous.subjects.find((s) => s.code === subject.code) : undefined)
    const previousMean = match?.class_mean ?? null
    subjects.set(subject.level_subject_id, {
      level_subject_id: subject.level_subject_id,
      current: subject.class_mean,
      previous: previousMean,
      change: change(subject.class_mean, previousMean),
    })
  }

  const previousMeans = new Map(previous.students.map((s) => [s.student_id, s.mean_marks]))
  const pupils = new Map<number, number | null>()
  for (const student of current.students) pupils.set(student.student_id, change(student.mean_marks, previousMeans.get(student.student_id) ?? null))

  const now = classMean(current)
  const before = classMean(previous)

  return { subjects, classMean: { level_subject_id: 0, current: now, previous: before, change: change(now, before) }, pupils }
}
