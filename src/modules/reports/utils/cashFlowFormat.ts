import { formatStatementMoney } from './incomeStatementFormat'

/** Exact decimal string to money: outflows in parentheses, zero as a dash. */
export const cashMoney = formatStatementMoney

/** Compact money for chart labels: 1.2M, 350K. Display only; never used in sums. */
export function compactMoney(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}B`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`
  return `${sign}${abs.toFixed(0)}`
}

export function isNegative(value: string): boolean {
  return value.trim().startsWith('-') && !/^-0+(\.0+)?$/.test(value.trim())
}

export function isZero(value: string): boolean {
  return /^-?0+(\.0+)?$/.test(value.trim())
}

/** "Jan 2026" from "2026-01". */
export function monthLabel(month: string): string {
  const [y = 0, m = 1] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

/** "5 Jan 2026" from "2026-01-05". */
export function dayLabel(date: string): string {
  const [y = 0, m = 1, d = 1] = date.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
