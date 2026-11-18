import type { Permission } from '@/lib/permissions'
import type { LucideIcon } from 'lucide-react'
import { CalendarRangeIcon, ClipboardPenIcon, FileTextIcon, HomeIcon, LibraryIcon, ListOrderedIcon, UserIcon, UsersIcon } from 'lucide-react'


export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Shown to users holding ANY of these; empty = everyone. */
  permissions: Permission[]
  end?: boolean
  /**
   * false keeps it out of the phone tab bar (sidebar only). A teacher who is
   * both class teacher and examiner already has seven tabs; phones reach these
   * pages from a Home card instead.
   */
  phone?: boolean
}

export const navigation: NavItem[] = [
  { to: '/', label: 'Home', icon: HomeIcon, permissions: [], end: true },
  { to: '/timetable', label: 'Timetable', icon: CalendarRangeIcon, permissions: ['view_own_timetable'] },
  { to: '/marking', label: 'Marking', icon: ClipboardPenIcon, permissions: ['enter_marks'] },
  { to: '/class', label: 'My class', icon: UsersIcon, permissions: ['view_class_pupils'] },
  { to: '/marklist', label: 'Mark list', icon: ListOrderedIcon, permissions: ['view_marklists'] },
  { to: '/report-cards', label: 'Reports', icon: FileTextIcon, permissions: ['view_report_cards', 'edit_report_entries'] },
  { to: '/materials', label: 'Materials', icon: LibraryIcon, permissions: ['view_teaching_materials'], phone: false },
  { to: '/account', label: 'Account', icon: UserIcon, permissions: [] },
]
