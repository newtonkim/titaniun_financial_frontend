import { errorMessage } from '../api'
import { computed, onMounted, ref } from 'vue'
import { balanceSheetApi, type BalanceSheetResponse } from '../api'
import { allExpandableKeys, buildStatementRows, defaultExpandedKeys } from '../utils/balanceSheetRows'
import { percentChange } from '../utils/accountingFormat'

function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export interface ReportSelection {
  mode: 'as-at' | 'compare'
  firstFrom: string
  firstTo: string
  secondFrom: string
  secondTo: string
}

export interface BalanceSheetKpi {
  key: 'assets' | 'liabilities' | 'equity'
  label: string
  amount: number
  compareAmount: number
  change: number | null
}

export function useBalanceSheet(options: { autoLoad?: boolean } = {}) {
  const asAt      = ref(todayIso())
  const mode = ref<'as-at' | 'compare'>('as-at')
  const year = new Date().getFullYear()
  const firstFrom = ref(`${year}-01-01`)
  const firstTo = ref(todayIso())
  const secondFrom = ref(`${year - 1}-01-01`)
  const secondTo = ref(`${year - 1}-12-31`)
  const selection = ref<ReportSelection | null>(null)
  const showComparison = computed(() => selection.value?.mode === 'compare')
  const hideZero  = ref(true)
  const loading   = ref(false)
  const error     = ref<string | null>(null)
  const result    = ref<BalanceSheetResponse | null>(null)
  const expanded  = ref<Set<string>>(new Set())

  const rows       = computed(() => result.value ? buildStatementRows(result.value, expanded.value) : [])
  const totals     = computed(() => result.value?.totals ?? null)
  const isBalanced = computed(() => totals.value?.current.is_balanced === true)

  const kpis = computed<BalanceSheetKpi[]>(() => {
    if (!totals.value) return []
    const { current: c, compare: p } = totals.value
    const kpi = (key: BalanceSheetKpi['key'], label: string, amount: number, compareAmount: number): BalanceSheetKpi =>
      ({ key, label, amount, compareAmount, change: percentChange(amount, compareAmount) })
    return [
      kpi('assets', 'Total Assets', c.total_assets, p.total_assets),
      kpi('liabilities', 'Total Liabilities', c.total_liabilities, p.total_liabilities),
      kpi('equity', "Members' Funds", c.total_equity, p.total_equity),
    ]
  })

  /** Ledger drill-down window: financial year start (or 1 Jan) up to the as-at date. */
  const drillRange = computed(() => {
    if (!result.value) return null
    return {
      from: (showComparison.value ? selection.value?.firstFrom : null) ?? result.value.financial_year?.start_date ?? `${result.value.as_at.slice(0, 4)}-01-01`,
      to: result.value.as_at,
    }
  })

  let requestVersion = 0

  async function generate() {
    const version = ++requestVersion
    const selected: ReportSelection = {
      mode: mode.value, firstFrom: firstFrom.value, firstTo: firstTo.value,
      secondFrom: secondFrom.value, secondTo: secondTo.value,
    }
    const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date))
    if (selected.mode === 'compare'
      ? ![selected.firstFrom, selected.firstTo, selected.secondFrom, selected.secondTo].every(validDate)
        || selected.firstFrom > selected.firstTo || selected.secondFrom > selected.secondTo
      : !validDate(asAt.value)) {
      result.value = null
      error.value = 'Enter valid dates. Each period start must be on or before its end.'
      loading.value = false
      return
    }
    loading.value = true
    error.value   = null
    try {
      const res = await balanceSheetApi.getBalanceSheet({
        as_at: selected.mode === 'compare' ? selected.firstTo : asAt.value,
        compare_to: selected.mode === 'compare' ? selected.secondTo : asAt.value,
        hide_zero: hideZero.value ? 1 : 0,
      })
      if (version !== requestVersion) return
      result.value    = res
      selection.value = selected
      expanded.value  = defaultExpandedKeys(res)
    } catch (e: unknown) {
      if (version !== requestVersion) return
      result.value = null
      error.value  = errorMessage(e, 'Failed to load balance sheet.')
    } finally {
      if (version === requestVersion) loading.value = false
    }
  }

  function toggle(key: string) {
    const next = new Set(expanded.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    expanded.value = next
  }

  function expandAll()   { if (result.value) expanded.value = allExpandableKeys(result.value) }
  function collapseAll() { expanded.value = new Set() }

  if (options.autoLoad !== false) onMounted(generate)

  return {
    asAt, mode, firstFrom, firstTo, secondFrom, secondTo, selection, showComparison, hideZero, loading, error, result, expanded,
    rows, totals, isBalanced, kpis, drillRange,
    generate, toggle, expandAll, collapseAll,
  }
}
