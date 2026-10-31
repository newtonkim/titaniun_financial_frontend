import { formatStatementMoney } from './incomeStatementFormat'

/** Exact decimal string to money: outflows in parentheses, zero as a dash. */
export const cashMoney = formatStatementMoney

export function isNegative(value: string): boolean {
  return value.trim().startsWith('-') && !/^-0+(\.0+)?$/.test(value.trim())
}

export function isZero(value: string): boolean {
  return /^-?0+(\.0+)?$/.test(value.trim())
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
