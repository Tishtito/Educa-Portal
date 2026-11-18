import { describe, expect, it } from 'vitest'
import type { TeachingMaterial } from '@/lib/api/types'
import { bySubject, groupByGradeThenSubject } from './grouping'

const UPPER = 2
const G4 = 14
const G5 = 15
const G6 = 16

const summary = {
  my_grade_ids: [G5, G6],
  levels: [
    { id: 1, code: 'lower_primary', name: 'Lower Primary', count: 0, grades: [] },
    {
      id: UPPER,
      code: 'upper_primary',
      name: 'Upper Primary',
      count: 0,
      grades: [
        { id: G4, code: 'G4', name: 'Grade 4', count: 0 },
        { id: G5, code: 'G5', name: 'Grade 5', count: 0 },
        { id: G6, code: 'G6', name: 'Grade 6', count: 0 },
      ],
    },
  ],
}

let nextId = 1
function material(title: string, grades: number[], subject?: string): TeachingMaterial {
  return {
    id: nextId++,
    title,
    description: null,
    level_id: UPPER,
    grades: grades.map((id) => ({ id, code: `G${id - 10}`, name: `Grade ${id - 10}` })),
    level_subject_id: subject ? subject.length : null,
    subject: subject ? { id: subject.length, name: subject, code: subject.slice(0, 3).toUpperCase() } : null,
    extension: 'pdf',
    size_bytes: 1,
    published_at: null,
    is_new: false,
  }
}

describe('groupByGradeThenSubject', () => {
  it('puts each material under every one of my grades it is for, whole-section ones under all', () => {
    const maths5 = material('Maths 5', [G5], 'Mathematics')
    const both = material('English 5 and 6', [G5, G6], 'English')
    const handbook = material('Handbook', [])
    const g4only = material('Grade 4 only', [G4], 'Mathematics')

    const groups = groupByGradeThenSubject([maths5, both, handbook, g4only], summary)

    expect(groups.map((g) => g.name)).toEqual(['Grade 5', 'Grade 6'])
    expect(groups[0]!.subjects.map((s) => [s.name, s.materials.map((m) => m.title)])).toEqual([
      ['English', ['English 5 and 6']],
      ['Mathematics', ['Maths 5']],
      ['General', ['Handbook']],
    ])
    expect(groups[1]!.subjects.flatMap((s) => s.materials.map((m) => m.title))).toEqual(['English 5 and 6', 'Handbook'])
  })

  it('leaves out my grades with nothing in them', () => {
    expect(groupByGradeThenSubject([material('Maths 5', [G5])], summary).map((g) => g.name)).toEqual(['Grade 5'])
  })

  it('is empty for a teacher with no grades', () => {
    expect(groupByGradeThenSubject([material('Any', [])], { ...summary, my_grade_ids: [] })).toEqual([])
  })
})

describe('bySubject', () => {
  it('sorts subjects by name with untagged last', () => {
    const groups = bySubject([material('a', [], 'Science'), material('b', []), material('c', [], 'Art')])
    expect(groups.map((g) => g.name)).toEqual(['Art', 'Science', 'General'])
  })
})
