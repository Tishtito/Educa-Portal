import type { MaterialSummary, TeachingMaterial } from '@/lib/api/types'

export interface SubjectGroup {
  key: string
  name: string
  materials: TeachingMaterial[]
}

export interface GradeGroup {
  gradeId: number
  name: string
  subjects: SubjectGroup[]
}

const NO_SUBJECT = 'General'

/**
 * "My grades": one section per grade the teacher has, each split by subject
 * (untagged last, as "General"). A material for the whole section, or tagged
 * with several of the teacher's grades, appears under each — a Grade 4 and a
 * Grade 6 teacher both expect the upper primary handbook under their grade.
 */
export function groupByGradeThenSubject(materials: TeachingMaterial[], summary: Pick<MaterialSummary, 'levels' | 'my_grade_ids'>): GradeGroup[] {
  const grades = summary.levels.flatMap((level) => level.grades.map((grade) => ({ ...grade, levelId: level.id })))

  return summary.my_grade_ids
    .map((gradeId) => grades.find((g) => g.id === gradeId))
    .filter((g): g is (typeof grades)[number] => g !== undefined)
    .map((grade) => {
      const forGrade = materials.filter((m) =>
        m.grades && m.grades.length > 0 ? m.grades.some((g) => g.id === grade.id) : m.level_id === grade.levelId,
      )
      return { gradeId: grade.id, name: grade.name, subjects: bySubject(forGrade) }
    })
    .filter((group) => group.subjects.length > 0)
}

export function bySubject(materials: TeachingMaterial[]): SubjectGroup[] {
  const groups = new Map<string, SubjectGroup>()
  for (const material of materials) {
    const key = material.subject ? String(material.subject.id) : 'none'
    const group = groups.get(key) ?? { key, name: material.subject?.name ?? NO_SUBJECT, materials: [] }
    group.materials.push(material)
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => (a.key === 'none' ? 1 : b.key === 'none' ? -1 : a.name.localeCompare(b.name)))
}
