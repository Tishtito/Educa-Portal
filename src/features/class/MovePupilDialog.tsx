import { useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/data/Field'
import { FormDialog } from '@/components/data/FormDialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { errorMessage } from '@/lib/api/errors'
import { useActiveClasses, useMovePupil } from './api'

/** Move a pupil out of the teacher's class into another class this year. */
export function MovePupilDialog({
  open,
  onOpenChange,
  pupil,
  currentClassId,
  onMoved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pupil: { id: number; full_name: string }
  currentClassId: number
  onMoved?: () => void
}) {
  const classes = useActiveClasses()
  const move = useMovePupil()
  const [classId, setClassId] = useState<string | undefined>(undefined)
  const options = (classes.data ?? []).filter((c) => c.id !== currentClassId)
  const target = options.find((c) => String(c.id) === classId)

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Move ${pupil.full_name}`}
      description="Changes their class for this year. Results already recorded stay with the class they were earned in. Once moved, the pupil is looked after by the new class teacher."
      submitLabel="Move"
      busy={move.isPending}
      onSubmit={() => {
        if (!target) return void toast.error('Choose the class to move them to.')
        move.mutate(
          { studentId: pupil.id, classId: target.id },
          {
            onSuccess: () => {
              toast.success(`${pupil.full_name} moved to ${target.name}.`)
              onOpenChange(false)
              onMoved?.()
            },
            onError: (error) => toast.error(errorMessage(error)),
          },
        )
      }}
    >
      <Field label="New class">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={classes.isPending ? 'Loading classes…' : 'Choose a class'} />
          </SelectTrigger>
          <SelectContent>
            {options.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </FormDialog>
  )
}
