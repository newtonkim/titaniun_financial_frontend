import type { CashFlowResponse, CashFlowRow, CashFlowSection } from '../api'
import { isNegative } from './cashFlowFormat'

/** One line of the statement. The page and every export read these, so they cannot differ. */
export type StatementLine =
  | { kind: 'heading'; key: string; label: string }
  | { kind: 'row'; key: string; row: CashFlowRow }
  | { kind: 'subtotal'; key: string; label: string; amount: string; compare_amount: string }
  | { kind: 'total'; key: string; label: string; amount: string; compare_amount: string }

const ACTIVITY: Record<string, string> = { operating: 'operating', investing: 'investing', financing: 'financing' }

/** "Net cash generated from" or "used in", following the sign, so a label never contradicts its figure. */
export function netCashLabel(key: string, amount: string): string {
  return `Net cash ${isNegative(amount) ? 'used in' : 'generated from'} ${ACTIVITY[key]} activities`
}

function operatingLines(section: CashFlowSection): StatementLine[] {
  const inGroup = (group: CashFlowRow['group']): StatementLine[] =>
    section.rows.filter((row) => row.group === group).map((row) => ({ kind: 'row', key: row.key, row }))
  const assets = inGroup('operating_assets')
  const liabilities = inGroup('operating_liabilities')
  const subtotals = section.subtotals

  return [
    ...inGroup('receipts_and_payments'),
    ...(subtotals
      ? [{ kind: 'subtotal' as const, key: 'before_changes', label: 'Cash flows from operating activities before changes in operating assets and liabilities', ...subtotals.before_changes }]
      : []),
    ...(assets.length ? [{ kind: 'heading' as const, key: 'operating_assets', label: 'Changes in operating assets' }, ...assets] : []),
    ...(liabilities.length ? [{ kind: 'heading' as const, key: 'operating_liabilities', label: 'Changes in operating liabilities' }, ...liabilities] : []),
    ...(subtotals
      ? [{ kind: 'subtotal' as const, key: 'before_tax', label: 'Net cash from operating activities before income tax', ...subtotals.before_tax }]
      : []),
    ...inGroup('income_tax'),
  ]
}

/** A section's lines in statement order, ending with its net cash total. */
export function sectionLines(section: CashFlowSection): StatementLine[] {
  const rows: StatementLine[] = section.key === 'operating'
    ? operatingLines(section)
    : section.rows.map((row) => ({ kind: 'row', key: row.key, row }))

  return [
    ...rows,
    { kind: 'total', key: `${section.key}_total`, label: netCashLabel(section.key, section.total), amount: section.total, compare_amount: section.compare_total },
  ]
}

/** The reconciliation under the three activities, from net movement to closing cash. */
export function reconciliationLines(r: CashFlowResponse): { key: string; label: string; amount: string; compare_amount: string; strong?: boolean }[] {
  const s = r.summary
  const migrated = Number(s.migrated) !== 0 || Number(s.compare_migrated) !== 0

  return [
    { key: 'net', label: `Net ${isNegative(s.net_change) ? 'decrease' : 'increase'} in cash and cash equivalents`, amount: s.net_change, compare_amount: s.compare_net_change, strong: true },
    { key: 'opening', label: 'Cash and cash equivalents at the start of the period', amount: s.opening_cash, compare_amount: s.compare_opening_cash },
    ...(migrated
      ? [{ key: 'migrated', label: 'Balances migrated at go-live (not a cash flow)', amount: s.migrated, compare_amount: s.compare_migrated }]
      : []),
    { key: 'closing', label: 'Cash and cash equivalents at the end of the period (note 1)', amount: s.closing_cash, compare_amount: s.compare_closing_cash, strong: true },
  ]
}

export const FINANCING_LIABILITY_ROWS: { key: 'opening' | 'proceeds' | 'repayments' | 'non_cash' | 'closing'; label: string; strong?: boolean }[] = [
  { key: 'opening', label: 'Borrowings at the start of the period', strong: true },
  { key: 'proceeds', label: 'Proceeds from borrowings' },
  { key: 'repayments', label: 'Repayments of borrowings' },
  { key: 'non_cash', label: 'Non-cash changes, such as interest added to the balance' },
  { key: 'closing', label: 'Borrowings at the end of the period', strong: true },
]

/** True when a period holds migrated balances, so it is not a complete period of cash flows. */
export function includesMigration(r: CashFlowResponse): boolean {
  return Number(r.summary.migrated) !== 0 || Number(r.summary.compare_migrated) !== 0
}
