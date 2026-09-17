import type { Permission } from '@/lib/permissions'
import type { LucideIcon } from 'lucide-react'
import { ClipboardPenIcon, FileTextIcon, HomeIcon, ListOrderedIcon, UserIcon, UsersIcon } from 'lucide-react'


export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Shown to users holding ANY of these; empty = everyone. */
  permissions: Permission[]
  end?: boolean
}

export const navigation: NavItem[] = [
  { to: '/', label: 'Home', icon: HomeIcon, permissions: [], end: true },
  { to: '/marking', label: 'Marking', icon: ClipboardPenIcon, permissions: ['enter_marks'] },
  { to: '/class', label: 'My class', icon: UsersIcon, permissions: ['view_class_pupils'] },
  { to: '/marklist', label: 'Mark list', icon: ListOrderedIcon, permissions: ['view_marklists'] },
  { to: '/report-cards', label: 'Reports', icon: FileTextIcon, permissions: ['view_report_cards', 'edit_report_entries'] },
  { to: '/account', label: 'Account', icon: UserIcon, permissions: [] },
]
