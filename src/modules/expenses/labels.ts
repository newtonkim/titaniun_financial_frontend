import type { ExpenseStatus, RecurringFrequency, RecurringStatus } from './types'

/** Words a basic user knows, with the badge colour each one shows in. */
export const EXPENSE_STATUS: Record<ExpenseStatus, { label: string; badge: string }> = {
  draft: { label: 'Not finished', badge: 'pending' },
  pending_approval: { label: 'Waiting for approval', badge: 'pending' },
  rejected: { label: 'Rejected', badge: 'rejected' },
  approved: { label: 'To pay', badge: 'pending' },
  posted: { label: 'Paid', badge: 'active' },
  reversed: { label: 'Undone', badge: 'inactive' },
  cancelled: { label: 'Cancelled', badge: 'inactive' },
}

export const RECURRING_STATUS: Record<RecurringStatus, { label: string; badge: string }> = {
  overdue: { label: 'Overdue', badge: 'rejected' },
  due_soon: { label: 'Due soon', badge: 'pending' },
  upcoming: { label: 'Upcoming', badge: 'active' },
  paused: { label: 'Paused', badge: 'inactive' },
  ended: { label: 'Ended', badge: 'inactive' },
}

export const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'yearly', label: 'Every year' },
]

export const frequencyLabel = (value: RecurringFrequency): string => FREQUENCIES.find((frequency) => frequency.value === value)?.label ?? value
