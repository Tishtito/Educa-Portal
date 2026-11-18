import { useDeferredValue, useState } from 'react'
import { FileIcon, FileImageIcon, FileSpreadsheetIcon, FileTextIcon, FolderOpenIcon, Loader2Icon, PresentationIcon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/data/PageHeader'
import { EmptyState, QueryState } from '@/components/data/QueryState'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { errorMessage } from '@/lib/api/errors'
import type { MaterialSummary, TeachingMaterial } from '@/lib/api/types'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'
import { openMaterial, useMaterialSummary, useMyMaterials, type MaterialFilters } from './api'
import { bySubject, groupByGradeThenSubject, type SubjectGroup } from './grouping'

const MINE = 'mine'

/**
 * Teaching materials the school has published. Opens on the teacher's own
 * grades; the section tabs browse everything else.
 */
export function MaterialsPage() {
  const summary = useMaterialSummary()

  return (
    <>
      <PageHeader title="Teaching materials" description="Schemes of work, notes and past papers shared by your school." />
      <QueryState query={summary}>{(data) => <Browser summary={data} />}</QueryState>
    </>
  )
}

function Browser({ summary }: { summary: MaterialSummary }) {
  const hasGrades = summary.my_grade_ids.length > 0
  // A teacher with no classes yet lands on the first section instead of an empty "My grades".
  const [tab, setTab] = useState<string>(hasGrades ? MINE : String(summary.levels[0]?.id ?? ''))
  const [gradeId, setGradeId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const q = useDeferredValue(search.trim())

  const level = summary.levels.find((l) => String(l.id) === tab)
  const filters: MaterialFilters = tab === MINE ? { q: q || undefined } : { level_id: level?.id, grade_id: gradeId ?? undefined, q: q || undefined }
  const materials = useMyMaterials(filters, tab === MINE || level !== undefined)

  return (
    <div className="grid gap-4">
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value)
          setGradeId(null)
        }}
      >
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          {hasGrades && <TabsTrigger value={MINE}>My grades</TabsTrigger>}
          {summary.levels.map((l) => (
            <TabsTrigger key={l.id} value={String(l.id)} className="gap-1.5">
              {l.name}
              <span className="text-xs text-muted-foreground tabular-nums">{l.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        {level && (
          <>
            <Chip active={gradeId === null} onClick={() => setGradeId(null)}>
              All
            </Chip>
            {level.grades.map((g) => (
              <Chip key={g.id} active={gradeId === g.id} onClick={() => setGradeId(g.id)}>
                {g.name}
              </Chip>
            ))}
          </>
        )}
        <div className="relative w-full sm:ml-auto sm:w-56">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles" className="pl-8" aria-label="Search materials" />
        </div>
      </div>

      <QueryState query={materials}>
        {(result) => {
          if (result.data.length === 0) {
            return (
              <EmptyState
                icon={<FolderOpenIcon />}
                title={q ? 'No materials match' : 'No materials here yet'}
                description={q ? 'Try another word.' : 'Your school has not shared any files for these grades yet.'}
              />
            )
          }

          if (tab === MINE) {
            return (
              <div className="grid gap-6">
                {groupByGradeThenSubject(result.data, summary).map((grade) => (
                  <section key={grade.gradeId} className="grid gap-3">
                    <h2 className="text-base font-semibold">{grade.name}</h2>
                    {grade.subjects.map((subject) => (
                      <SubjectList key={subject.key} group={subject} />
                    ))}
                  </section>
                ))}
              </div>
            )
          }

          return (
            <div className="grid gap-3">
              {bySubject(result.data).map((subject) => (
                <SubjectList key={subject.key} group={subject} showGrades />
              ))}
            </div>
          )
        }}
      </QueryState>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn('inline-flex h-8 items-center rounded-full border px-3 text-sm transition-colors', active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')}
    >
      {children}
    </button>
  )
}

function SubjectList({ group, showGrades }: { group: SubjectGroup; showGrades?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.name}</h3>
      <Card className="divide-y overflow-hidden p-0">
        {group.materials.map((m) => (
          <MaterialItem key={m.id} material={m} showGrades={showGrades} />
        ))}
      </Card>
    </div>
  )
}

const kinds: Record<string, [typeof FileIcon, string]> = {
  pdf: [FileTextIcon, 'bg-red-500/10 text-red-600 dark:text-red-400'],
  doc: [FileTextIcon, 'bg-blue-500/10 text-blue-600 dark:text-blue-400'],
  docx: [FileTextIcon, 'bg-blue-500/10 text-blue-600 dark:text-blue-400'],
  ppt: [PresentationIcon, 'bg-orange-500/10 text-orange-600 dark:text-orange-400'],
  pptx: [PresentationIcon, 'bg-orange-500/10 text-orange-600 dark:text-orange-400'],
  xls: [FileSpreadsheetIcon, 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'],
  xlsx: [FileSpreadsheetIcon, 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'],
  jpg: [FileImageIcon, 'bg-violet-500/10 text-violet-600 dark:text-violet-400'],
  jpeg: [FileImageIcon, 'bg-violet-500/10 text-violet-600 dark:text-violet-400'],
  png: [FileImageIcon, 'bg-violet-500/10 text-violet-600 dark:text-violet-400'],
}

function MaterialItem({ material, showGrades }: { material: TeachingMaterial; showGrades?: boolean }) {
  const [opening, setOpening] = useState(false)
  const [Icon, style] = kinds[material.extension] ?? [FileIcon, 'bg-muted text-muted-foreground']
  const grades = material.grades && material.grades.length > 0 ? material.grades.map((g) => g.name).join(', ') : `All of ${material.level?.name ?? 'the section'}`

  async function open() {
    setOpening(true)
    try {
      await openMaterial(material)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  return (
    <button type="button" onClick={() => void open()} disabled={opening} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 disabled:opacity-70">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', style)}>{opening ? <Loader2Icon className="size-4 animate-spin" /> : <Icon className="size-4" />}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{material.title}</span>
          {material.is_new && <Badge className="shrink-0">New</Badge>}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {[material.extension.toUpperCase(), formatBytes(material.size_bytes), showGrades ? grades : null].filter(Boolean).join(' · ')}
        </span>
        {material.description && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{material.description}</span>}
      </span>
    </button>
  )
}
