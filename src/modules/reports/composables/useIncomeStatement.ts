import { errorMessage } from '../api'
import { onMounted, ref } from 'vue'
import {
  incomeStatementApi,
  type IncomeStatementParams,
  type IncomeStatementResponse,
} from '../api'

export function validReportDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}
export function useIncomeStatement(options: { autoLoad?: boolean } = {}) {
  const from = ref('')
  const to = ref('')
  const compareFrom = ref('')
  const compareTo = ref('')
  const hideZero = ref(true)
  const loading = ref(false)
  const error = ref('')
  const result = ref<IncomeStatementResponse | null>(null)
  const expanded = ref(new Set<string>())
  let version = 0
  async function generate(defaultPeriod = false) {
    const requestVersion = ++version
    const params: IncomeStatementParams = { hide_zero: hideZero.value ? 1 : 0 }
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
    result.value = null
    try {
      const data = await incomeStatementApi.getStatement(params)
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
      error.value =
        errorMessage(e, 'Unable to load the income statement.')
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
