import { formatMoneyValue } from '../utils/money'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

/** Accounting style: negatives in parentheses, zero as an em dash, null as blank. */
export function formatAccounting(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const rounded = Math.round(value * 100) / 100
  if (rounded === 0) return '—'
  const text = formatMoneyValue(Math.abs(rounded))
  return rounded < 0 ? `(${text})` : text
}

/** Percentage change from previous to current; null when there is no base to compare. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return [y ?? 0, (m ?? 1) - 1, d ?? 1]
}

export function formatLongDate(iso: string): string {
  const [y, m, d] = parts(iso)
  return `${d} ${MONTHS[m]} ${y}`
}

export function formatShortDate(iso: string): string {
  const [y, m, d] = parts(iso)
  return `${d} ${MONTHS[m]!.slice(0, 3)} ${y}`
}
