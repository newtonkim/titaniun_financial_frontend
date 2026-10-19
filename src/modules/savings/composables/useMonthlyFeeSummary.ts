import { computed, type Ref } from 'vue'
import type { FeeMeasure, SavingsProductSettings } from '../types'

export const CURRENCY = 'UGX'

function formatFee(value: number | string | null | undefined, type: FeeMeasure | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return '—'
  if (type === 'percentage') return `${parsed}%`
  return `${CURRENCY} ${parsed}`
}

/** A one-line description of the monthly fee and any loyalty adjustment. */
export function useMonthlyFeeSummary(form: Ref<SavingsProductSettings>) {
  const monthlyFeeSummary = computed(() => {
    if (!form.value.monthly_fee_enabled) return ''

    const baseType = form.value.monthly_fee_type ?? 'amount'
    let summary = `All members: ${formatFee(form.value.monthly_fee_amount, baseType)} monthly fee.`

    if (!form.value.loyalty_fee_enabled) return summary

    const value = form.value.loyalty_adjustment_value
    switch (form.value.loyalty_adjustment_type) {
      case 'discount_percentage':
        summary += ` Loyal members: ${formatFee(value, 'percentage')} discount.`
        break
      case 'fixed_discount':
        summary += ` Loyal members: ${formatFee(value, 'amount')} off the base fee.`
        break
      case 'custom_fee':
        summary += ` Loyal members: ${formatFee(value, baseType)} custom fee.`
        break
    }

    return summary
  })

  return { monthlyFeeSummary }
}
