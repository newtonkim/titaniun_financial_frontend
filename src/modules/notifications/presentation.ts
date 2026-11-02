import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { Banknote, BellRing, Clock, FileText, Landmark, LogOut, Receipt, RotateCcw, TriangleAlert, Unlock, UserCheck, XCircle } from 'lucide-vue-next'
import { formatDate, formatMoney } from '@/core/utils/format'
import type { StaffNotification } from './types'

type Tone = 'urgent' | 'approval' | 'money' | 'review'

export const TONE_CLASSES: Record<Tone, string> = {
  urgent: 'bg-primary/10 text-primary',
  approval: 'bg-navy/10 text-navy dark:bg-white/10 dark:text-white',
  money: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  review: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
}

const TYPES: Record<string, { title: string; icon: Component; tone: Tone; to: (id: number | null) => RouteLocationRaw; counted?: [one: string, many: string] }> = {
  overdue_loans: { title: 'Loans overdue', icon: TriangleAlert, tone: 'urgent', to: () => ({ name: 'loans.collections' }), counted: ['loan needs follow-up', 'loans need follow-up'] },
  loan_application: { title: 'Loan application to review', icon: Landmark, tone: 'approval', to: (id) => ({ name: 'loans.show', params: { id } }) },
  loan_disbursement: { title: 'Approved loan to disburse', icon: Banknote, tone: 'money', to: (id) => ({ name: 'loans.show', params: { id } }) },
  member_approval: { title: 'New member to approve', icon: UserCheck, tone: 'approval', to: (id) => ({ name: 'members.show', params: { id } }) },
  savings_reversal: { title: 'Savings reversal to approve', icon: RotateCcw, tone: 'urgent', to: () => ({ name: 'savings.approvals' }) },
  savings_close: { title: 'Account closure to approve', icon: XCircle, tone: 'approval', to: () => ({ name: 'savings.approvals' }) },
  savings_reactivate: { title: 'Account reactivation to approve', icon: RotateCcw, tone: 'approval', to: () => ({ name: 'savings.approvals' }) },
  savings_release_freeze: { title: 'Freeze release to approve', icon: Unlock, tone: 'approval', to: () => ({ name: 'savings.approvals' }) },
  member_exit: { title: 'Member exit to approve', icon: LogOut, tone: 'approval', to: () => ({ name: 'savings.approvals' }) },
  dormant_review: { title: 'Accounts to review for dormancy', icon: Clock, tone: 'review', to: () => ({ name: 'savings.dormant' }), counted: ['account has no member activity', 'accounts have no member activity'] },
  journal_draft: { title: 'Journal entry to post', icon: FileText, tone: 'review', to: () => ({ name: 'accounting.journal-entries' }) },
  expense_approval: { title: 'Expense voucher to approve', icon: Receipt, tone: 'approval', to: (id) => ({ name: 'expenses.show', params: { id } }) },
  expense_payment: { title: 'Approved expense to pay', icon: Banknote, tone: 'money', to: (id) => ({ name: 'expenses.show', params: { id } }) },
  expense_reversal: { title: 'Expense reversal to approve', icon: RotateCcw, tone: 'urgent', to: (id) => ({ name: 'expenses.show', params: { id } }) },
  dividend_draft: { title: 'Draft dividend to approve', icon: FileText, tone: 'review', to: () => ({ name: 'shares.dividends' }) },
}

const FALLBACK: (typeof TYPES)[string] = { title: 'Notification', icon: BellRing, tone: 'approval', to: () => ({ name: 'notifications.index' }) }

export function presentNotification(item: StaffNotification) {
  const type = TYPES[item.type] ?? FALLBACK
  const subject = item.count !== null ? `${item.count.toLocaleString('en-GB')} ${type.counted?.[item.count === 1 ? 0 : 1] ?? ''}`.trim() : item.subject
  const amount = item.amount === null ? null : `UGX ${formatMoney(item.amount)}`
  return { ...type, subject, amount, to: type.to(item.record_id), toneClass: TONE_CLASSES[type.tone] }
}

/** `Just now`, `12 min ago`, `3 hr ago`, `Yesterday`, then the date. A daily reminder always reads `Today`. */
export function notificationTime(item: StaffNotification, now = Date.now()): string {
  if (item.record_id === null) return 'Today'
  const minutes = Math.floor((now - new Date(item.occurred_at).getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return days < 7 ? `${days} days ago` : formatDate(item.occurred_at)
}
