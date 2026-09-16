import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MyAssignments } from '@/lib/api/types'

type TaughtClass = MyAssignments['class_teacher_of'][number]

/** Shown only to teachers with more than one class. */
export function ClassPicker({ classes, value, onChange }: { classes: TaughtClass[]; value: number | null; onChange: (classId: number) => void }) {
  if (classes.length < 2) return null

  return (
    <Select value={value ? String(value) : undefined} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-48" aria-label="Class">
        <SelectValue placeholder="Choose a class" />
      </SelectTrigger>
      <SelectContent>
        {classes.map((c) => (
          <SelectItem key={c.class_id} value={String(c.class_id)}>
            {c.class_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
