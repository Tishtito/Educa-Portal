import { describe, expect, it } from 'vitest'
import type { ExamStatus, MyExam } from '@/lib/api/types'
import { pickCurrentExam } from './currentExam'

const exam = (id: number, status: ExamStatus) => ({ id, status }) as MyExam

describe('pickCurrentExam', () => {
  const exams = [exam(4, 'draft'), exam(3, 'open'), exam(2, 'locked'), exam(1, 'marking')]

  it('keeps the exam the user chose when it still involves them', () => {
    expect(pickCurrentExam(exams, 2)?.id).toBe(2)
  })

  it('otherwise prefers marking, then finished, then open, then the newest', () => {
    expect(pickCurrentExam(exams, 99)?.id).toBe(1)
    expect(pickCurrentExam([exam(4, 'draft'), exam(3, 'open'), exam(2, 'published')], null)?.id).toBe(2)
    expect(pickCurrentExam([exam(4, 'draft'), exam(3, 'open')], null)?.id).toBe(3)
    expect(pickCurrentExam([exam(4, 'draft')], null)?.id).toBe(4)
    expect(pickCurrentExam([], 1)).toBeNull()
  })
})
