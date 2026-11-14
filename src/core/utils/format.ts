const currency = import.meta.env.VITE_CURRENCY?.trim() || undefined

const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  ...(currency ? { style: 'currency', currency, currencyDisplay: 'code' } : {}),
})
const compactFormatter = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
const percentFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const amount = Number(value)
  return Number.isNaN(amount) ? String(value) : moneyFormatter.format(amount)
}

/** A percentage held to more places than people read, e.g. 16.66666667 as 16.67. */
export function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const amount = Number(value)
  return Number.isNaN(amount) ? String(value) : percentFormatter.format(amount)
}

/** Short axis label: 12.5K, 3M. */
export function formatCompact(value: number): string {
  return compactFormatter.format(value)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

/** `reducing_balance` → `Reducing balance` */
export function formatEnum(value: string | null | undefined): string {
  if (!value) return '—'
  const text = value.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** `2026-10` → `Oct` (or `Oct 2026` when `withYear`). */
export function formatMonth(value: string, withYear = false): string {
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return value
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, withYear ? { month: 'long', year: 'numeric' } : { month: 'short' })
}
