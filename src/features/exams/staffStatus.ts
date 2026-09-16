import type { ExamStatus } from '@/lib/api/types'

/** What each exam state means for the people doing the marking and the reports. */
export const staffStatusText: Record<ExamStatus, string> = {
  draft: 'Being set up by the school. Nothing to do yet.',
  open: 'Set up, but marking has not started. Marks-out-of can still be changed.',
  marking: 'Marking is open — marks can be entered and changed.',
  locked: 'Marking is closed and results are final. Report cards can be prepared.',
  published: 'Report cards have been issued.',
  archived: 'Historical.',
}

export const hasFinalResults = (status: ExamStatus) => status === 'locked' || status === 'published' || status === 'archived'
