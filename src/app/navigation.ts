import type { LucideIcon } from 'lucide-react'
import { ClipboardPenIcon, FileTextIcon, HomeIcon, ListOrderedIcon, UserIcon, UsersIcon } from 'lucide-react'

export type Duty = 'all' | 'class_teacher' | 'examiner'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  duty: Duty
  end?: boolean
}

export const navigation: NavItem[] = [
  { to: '/', label: 'Home', icon: HomeIcon, duty: 'all', end: true },
  { to: '/marking', label: 'Marking', icon: ClipboardPenIcon, duty: 'examiner' },
  { to: '/class', label: 'My class', icon: UsersIcon, duty: 'class_teacher' },
  { to: '/marklist', label: 'Mark list', icon: ListOrderedIcon, duty: 'class_teacher' },
  { to: '/report-cards', label: 'Reports', icon: FileTextIcon, duty: 'class_teacher' },
  { to: '/account', label: 'Account', icon: UserIcon, duty: 'all' },
]
