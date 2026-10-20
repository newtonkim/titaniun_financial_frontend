import type { MemberStatus } from './types'

export function memberInitials(name: string | null | undefined): string {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'M'
}

/** `12 days ago`, `3 months ago`; empty for future dates. */
export function relativeDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const days = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (days < 0) return ''
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years > 1 ? 's' : ''} ago`
}

export function genderPill(gender: string | null | undefined): string {
  if (gender === 'male') return 'bg-teal-50 text-teal-700 ring-teal-600/15 dark:bg-teal-500/10 dark:text-teal-300'
  if (gender === 'female') return 'bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300'
  return 'bg-neutral-100 text-neutral-500 ring-neutral-500/15 dark:bg-neutral-800 dark:text-neutral-300'
}

export function statusPill(status: MemberStatus): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300'
    case 'pending':
      return 'bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300'
    case 'rejected':
    case 'suspended':
      return 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300'
    default:
      return 'bg-neutral-100 text-neutral-600 ring-neutral-500/15 dark:bg-neutral-800 dark:text-neutral-300'
  }
}
