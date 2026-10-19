import { errorMessage } from '../api'
import { onMounted, ref } from 'vue'
import {
  cashFlowApi,
  type CashFlowParams,
  type CashFlowResponse,
} from '../api'
import { validReportDate } from './useIncomeStatement'

/**
 * State for the cash flow statement page. Opens on the financial year to date,
 * which the server works out; the other periods are picked here.
 */
export function useCashFlow(options: { autoLoad?: boolean } = {}) {
  const from = ref('')
  const to = ref('')
  const compareFrom = ref('')
  const compareTo = ref('')
  const hideZero = ref(true)
  const loading = ref(false)
  const error = ref('')
  const result = ref<CashFlowResponse | null>(null)
  const expanded = ref(new Set<string>())
  let version = 0

  async function generate(defaultPeriod = false) {
    const requestVersion = ++version
    const params: CashFlowParams = { hide_zero: hideZero.value ? 1 : 0 }
    if (!defaultPeriod) {
      if (
        ![from.value, to.value, compareFrom.value, compareTo.value].every(validReportDate) ||
        from.value > to.value ||
        compareFrom.value > compareTo.value
      ) {
        error.value = 'Enter valid dates with each start on or before its end.'
        result.value = null
        loading.value = false
        return
      }
      Object.assign(params, {
        from: from.value,
        to: to.value,
        compare_from: compareFrom.value,
        compare_to: compareTo.value,
      })
    }
    loading.value = true
    error.value = ''
    try {
      const data = await cashFlowApi.getStatement(params)
      if (requestVersion !== version) return
      result.value = data
      if (defaultPeriod) {
        from.value = data.from
        to.value = data.to
        compareFrom.value = data.compare_from
        compareTo.value = data.compare_to
      }
      expanded.value = new Set()
    } catch (e: unknown) {
      if (requestVersion !== version) return
      result.value = null
      error.value =
        errorMessage(e, 'Unable to load the cash flow statement.')
    } finally {
      if (requestVersion === version) loading.value = false
    }
  }

  function toggle(key: string) {
    const next = new Set(expanded.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    expanded.value = next
  }

  /** Month or quarter to date, compared with the same dates a year earlier. */
  function setPreset(preset: 'month' | 'quarter') {
    const now = new Date()
    const month = preset === 'quarter' ? Math.floor(now.getMonth() / 3) * 3 : now.getMonth()
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    from.value = iso(new Date(now.getFullYear(), month, 1))
    to.value = iso(now)
    const prior = (value: string) => {
      const [y = 0, m = 1, day = 1] = value.split('-').map(Number)
      return iso(new Date(y - 1, m - 1, Math.min(day, new Date(y - 1, m, 0).getDate())))
    }
    compareFrom.value = prior(from.value)
    compareTo.value = prior(to.value)
    void generate()
  }

  if (options.autoLoad !== false) onMounted(() => generate(true))

  return {
    from,
    to,
    compareFrom,
    compareTo,
    hideZero,
    loading,
    error,
    result,
    expanded,
    generate,
    toggle,
    setPreset,
  }
}
