import { ApiError, http } from '@/core/api/http'
import type { PaginationMeta, Wrapped } from '@/core/api/types'
import type {
  BalanceSheetLine,
  BalanceSheetParams,
  BalanceSheetResponse,
  BalanceSheetTotals,
  CashFlowLedgerLine,
  CashFlowParams,
  CashFlowResponse,
  IncomeLedgerLine,
  IncomeStatementParams,
  IncomeStatementResponse,
  LedgerPage,
  LedgerParams,
  TrialBalanceLedgerLine,
  TrialBalanceParams,
  TrialBalanceResponse,
} from './statements'
import type { DashboardSummary } from './types'

/** The reporting entity named on statements and exports. */
export const REPORT_ENTITY = 'Titanium Financial'

/** The message to show for a failed report request. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback
}

interface LedgerResponse<T> {
  data: T[]
  meta: PaginationMeta
  account: LedgerPage<T>['account']
}

async function ledger<T>(path: string, params: LedgerParams): Promise<LedgerPage<T>> {
  const { data, meta, account } = await http.get<LedgerResponse<T>>(path, { ...params })
  return { account, data, current_page: meta.current_page, last_page: meta.last_page, total: meta.total, per_page: meta.per_page }
}

const TRIAL_BALANCE_AMOUNTS = ['opening_debit', 'opening_credit', 'period_debit', 'period_credit', 'closing_debit', 'closing_credit'] as const

/** The trial balance and balance sheet pages do arithmetic on amounts, which arrive as decimal strings. */
function toNumbers<T extends object>(row: T, keys: readonly string[]): T {
  const copy = { ...row } as Record<string, unknown>
  for (const key of keys) copy[key] = Number(copy[key])
  return copy as T
}

function balanceSheetLine(line: BalanceSheetLine): BalanceSheetLine {
  return { ...toNumbers(line, ['amount', 'compare_amount']), children: line.children.map(balanceSheetLine) }
}

function balanceSheetTotals(totals: BalanceSheetTotals): BalanceSheetTotals {
  return toNumbers(totals, ['total_assets', 'total_liabilities', 'total_equity', 'total_liabilities_and_equity', 'difference'])
}

export const reportsApi = {
  dashboard: (months: 6 | 12 = 6) => http.get<Wrapped<DashboardSummary>>('/reports/dashboard', { months }).then((response) => response.data),
}

export const trialBalanceApi = {
  async getTrialBalance(params: TrialBalanceParams): Promise<TrialBalanceResponse> {
    const { data } = await http.get<Wrapped<TrialBalanceResponse>>('/reports/trial-balance', { ...params })
    return {
      ...data,
      accounts: data.accounts.map((account) => toNumbers(account, TRIAL_BALANCE_AMOUNTS)),
      totals: toNumbers(data.totals, TRIAL_BALANCE_AMOUNTS.map((key) => `total_${key}`)),
    }
  },
  getLedgerLines: (params: LedgerParams) => ledger<TrialBalanceLedgerLine>('/reports/trial-balance/ledger', params),
}

export const balanceSheetApi = {
  async getBalanceSheet(params: BalanceSheetParams): Promise<BalanceSheetResponse> {
    const { data } = await http.get<Wrapped<BalanceSheetResponse>>('/reports/balance-sheet', { ...params })
    return {
      ...data,
      sections: data.sections.map((section) => ({
        ...toNumbers(section, ['total', 'compare_total']),
        lines: section.lines.map(balanceSheetLine),
      })),
      totals: { current: balanceSheetTotals(data.totals.current), compare: balanceSheetTotals(data.totals.compare) },
    }
  },
}

export const incomeStatementApi = {
  getStatement: (params: IncomeStatementParams) =>
    http.get<Wrapped<IncomeStatementResponse>>('/reports/income-statement', { ...params }).then((response) => response.data),
  getLedgerLines: (params: LedgerParams) => ledger<IncomeLedgerLine>('/reports/income-statement/ledger', params),
}

export const cashFlowApi = {
  getStatement: (params: CashFlowParams) =>
    http.get<Wrapped<CashFlowResponse>>('/reports/cash-flow', { ...params }).then((response) => response.data),
  getLedger: (params: LedgerParams) => ledger<CashFlowLedgerLine>('/reports/cash-flow/ledger', params),
}

/** Response types live in statements.ts; re-exported so pages import from one place. */
export type * from './statements'
