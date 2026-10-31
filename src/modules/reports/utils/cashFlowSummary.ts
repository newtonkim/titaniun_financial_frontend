import type { CashFlowResponse } from '../api'
import { cashMoney, dayLabel, isNegative, isZero } from './cashFlowFormat'

/** Amount without sign or parentheses: "1,280.00". */
function plain(value: string): string {
  const abs = value.trim().replace(/^-/, '')
  return isZero(abs) ? '0.00' : cashMoney(abs)
}

function activity(name: string, value: string): string | null {
  if (isZero(value)) return null
  return isNegative(value) ? `${name} used ${plain(value)}` : `${name} brought in ${plain(value)}`
}

/**
 * The statement in two or three plain sentences: what happened to cash overall,
 * which activities drove it, and the largest single flow.
 */
export function cashFlowSummary(r: CashFlowResponse): string {
  const s = r.summary
  const c = r.currency
  const period = `between ${dayLabel(r.from)} and ${dayLabel(r.to)}`

  const overall = isZero(s.net_change)
    ? `Cash was unchanged ${period}, at ${c} ${plain(s.closing_cash)}.`
    : `Cash ${isNegative(s.net_change) ? 'fell' : 'rose'} by ${c} ${plain(s.net_change)} ${period}, from ${plain(s.opening_cash)} to ${plain(s.closing_cash)}.`

  const parts = [
    activity('Operating activities', s.operating),
    activity('investing', s.investing),
    activity('financing', s.financing),
  ].filter((p): p is string => p !== null)

  const drivers = parts.length
    ? ` ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]}.`.replace(
        /^ ([a-z])/,
        (m) => m.toUpperCase(),
      )
    : ' No cash moved in the period.'

  const largest = r.sections
    .flatMap((section) => section.rows)
    .filter((row) => !isZero(row.amount))
    .sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))[0]

  const biggest = largest
    ? ` The largest single flow was ${largest.label.charAt(0).toLowerCase()}${largest.label.slice(1)} (${plain(largest.amount)} ${isNegative(largest.amount) ? 'out' : 'in'}).`
    : ''

  const migrated = isZero(s.migrated)
    ? ''
    : ` Closing cash also includes ${c} ${plain(s.migrated)} of balances migrated at go-live, which is not a cash flow.`

  return `${overall}${drivers}${biggest}${migrated}`
}
