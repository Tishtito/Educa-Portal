import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Field } from '@/components/data/Field'
import { FormDialog } from '@/components/data/FormDialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Student } from '@/lib/api/types'
import { showFormError } from '@/lib/forms'
import { useAdmitPupil } from './api'

const NONE = 'none'

const schema = z.object({
  admission_no: z.string().trim().min(1, 'Enter the admission number').max(40),
  first_name: z.string().trim().min(1, 'Enter the first name').max(80),
  middle_name: z.string().trim().max(80),
  last_name: z.string().trim().min(1, 'Enter the last name').max(80),
  gender: z.string(),
  date_of_birth: z.string(),
  guardian_name: z.string().trim().max(160),
  guardian_phone: z.string().trim().max(40),
  upi: z.string().trim().max(40),
})

type Values = z.infer<typeof schema>

const FIELDS = ['admission_no', 'first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth', 'guardian_name', 'guardian_phone', 'upi'] as const

/** Admit a new pupil straight into the teacher's class for this year. */
export function AdmitPupilDialog({
  open,
  onOpenChange,
  classId,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  classId: number
  className: string
}) {
  const admit = useAdmitPupil(classId)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      admission_no: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      gender: NONE,
      date_of_birth: '',
      guardian_name: '',
      guardian_phone: '',
      upi: '',
    },
  })
  const gender = useWatch({ control: form.control, name: 'gender' })
  const { errors, isSubmitting } = form.formState

  async function submit(values: Values) {
    try {
      const saved = await admit.mutateAsync({
        admission_no: values.admission_no,
        first_name: values.first_name,
        middle_name: values.middle_name || null,
        last_name: values.last_name,
        gender: values.gender === NONE ? null : (values.gender as Student['gender']),
        date_of_birth: values.date_of_birth || null,
        guardian_name: values.guardian_name || null,
        guardian_phone: values.guardian_phone || null,
        upi: values.upi || null,
      })
      toast.success(`${saved.full_name} admitted to ${className}.`)
      onOpenChange(false)
    } catch (error) {
      showFormError(form, error, FIELDS)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Admit a pupil to ${className}`}
      description="For a pupil new to the school. A pupil already on the register is moved by their current class teacher or the school office."
      submitLabel="Admit"
      busy={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
      wide
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Admission no." htmlFor="st-adm" error={errors.admission_no?.message}>
          <Input id="st-adm" {...form.register('admission_no')} />
        </Field>
        <Field label="UPI (NEMIS)" htmlFor="st-upi" error={errors.upi?.message}>
          <Input id="st-upi" {...form.register('upi')} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="First name" htmlFor="st-first" error={errors.first_name?.message}>
          <Input id="st-first" {...form.register('first_name')} />
        </Field>
        <Field label="Middle name" htmlFor="st-middle" error={errors.middle_name?.message}>
          <Input id="st-middle" {...form.register('middle_name')} />
        </Field>
        <Field label="Last name" htmlFor="st-last" error={errors.last_name?.message}>
          <Input id="st-last" {...form.register('last_name')} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Gender">
          <Select value={gender} onValueChange={(v) => form.setValue('gender', v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not recorded</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="male">Male</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date of birth" htmlFor="st-dob" error={errors.date_of_birth?.message}>
          <Input id="st-dob" type="date" {...form.register('date_of_birth')} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Parent or guardian" htmlFor="st-guardian" error={errors.guardian_name?.message}>
          <Input id="st-guardian" {...form.register('guardian_name')} />
        </Field>
        <Field label="Guardian phone" htmlFor="st-phone" error={errors.guardian_phone?.message}>
          <Input id="st-phone" inputMode="tel" {...form.register('guardian_phone')} />
        </Field>
      </div>
    </FormDialog>
  )
}
