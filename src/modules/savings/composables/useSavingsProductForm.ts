import { computed, ref, watch, type Ref } from 'vue'
import { ApiError } from '@/core/api/http'
import { chartOfAccountsApi } from '@/modules/accounting/api'
import type { ChartOfAccount } from '@/modules/accounting/types'
import { savingsProductsApi } from '../api'
import type { ChargeTrigger, SavingsProduct, SavingsProductCharge, SavingsProductSettings } from '../types'
import { useMonthlyFeeSummary } from './useMonthlyFeeSummary'

type NumberLike = number | string

export type SavingsProductForm = SavingsProductSettings & { id?: number }

function createDefaultForm(): SavingsProductForm {
  return {
    name: '',
    description: '',
    type: 'fixed',
    interest_rate: 0,
    minimum_balance: 0,
    minimum_maturity_months: 0,
    dormancy_period_months: 6,
    charge_on_deposit: false,
    charge_on_withdraw: false,
    charge_on_transfer: false,
    monthly_fee_enabled: false,
    monthly_fee_type: 'amount',
    monthly_fee_amount: null,
    monthly_fee_deduction_day: 1,
    loyalty_fee_enabled: false,
    loyalty_adjustment_type: 'discount_percentage',
    loyalty_adjustment_value: null,
    interest_payout_type: 'at_maturity',
    interest_posting_frequency: 'monthly',
    default_tenor_months: 6,
    maturity_action: 'manual',
    convert_to_product_id: null,
    liability_account_id: null,
    cash_account_id: null,
    interest_expense_account_id: null,
    interest_payable_account_id: null,
    is_active: true,
    charges: [],
  }
}

/** Strips thousands separators typed into a money field. */
export function normalizeNumberInput(value: NumberLike | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/,/g, '')
}

/** Formats a money field with thousands separators for display. */
export function formatNumberInput(value: NumberLike | null | undefined): string {
  const normalized = normalizeNumberInput(value)
  if (normalized === '') return ''
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? normalized : new Intl.NumberFormat('en-US').format(parsed)
}

/**
 * Create or edit a savings product inside a drawer: `productId` null means create.
 * Call `open()` each time the drawer opens; `onSaved` runs after a successful save.
 */
export function useSavingsProductForm(productId: Ref<number | null>, onSaved: (product: SavingsProduct) => void) {
  const isEditing = computed(() => productId.value !== null)
  const loading = ref(false)
  const saving = ref(false)
  const message = ref('')
  const errors = ref<Record<string, string[]>>({})
  const form = ref<SavingsProductForm>(createDefaultForm())
  const selectedChargeTab = ref<ChargeTrigger>('deposit')

  const chartAccounts = ref<ChartOfAccount[]>([])
  const products = ref<SavingsProduct[]>([])

  const liabilityAccounts = computed(() =>
    chartAccounts.value.filter((a) => a.type === 'liability').map((a) => ({ id: a.id, name: `${a.code} — ${a.name}` })),
  )
  const cashAccounts = computed(() =>
    chartAccounts.value
      .filter((a) => a.type === 'asset' && ['Cash', 'Bank'].includes(a.subtype ?? ''))
      .map((a) => ({ id: a.id, name: `${a.code} — ${a.name}` })),
  )

  async function loadSupportingData() {
    try {
      const [accounts, productList] = await Promise.all([
        chartOfAccountsApi.list({ is_active: true }),
        savingsProductsApi.list({ per_page: 100 }),
      ])
      chartAccounts.value = accounts.data.filter((a) => a.is_postable && a.is_active)
      products.value = productList.data
    } catch {
      message.value = 'Failed to load chart of accounts.'
    }
  }

  async function loadProduct() {
    if (productId.value === null) return
    loading.value = true
    try {
      const product = await savingsProductsApi.show(productId.value)
      form.value = { ...createDefaultForm(), ...product, charges: (product.charges ?? []).map((c) => ({ ...c })) }
    } catch {
      message.value = 'Failed to load savings product.'
    } finally {
      loading.value = false
    }
  }

  /** Reset the form and load whatever the drawer needs for `productId`. */
  async function open() {
    form.value = createDefaultForm()
    errors.value = {}
    message.value = ''
    selectedChargeTab.value = 'deposit'
    await Promise.all([loadProduct(), loadSupportingData()])
  }

  function fieldError(field: string): string | null {
    return errors.value[field]?.[0] ?? null
  }

  // ─── Charges ──────────────────────────────────────────────────────────────
  function nextMinimum(type: ChargeTrigger): number {
    const maxValues = form.value.charges
      .filter((charge) => charge.type === type)
      .map((charge) => Number(normalizeNumberInput(charge.maximum_amount)))
      .filter((value) => Number.isFinite(value))
    return maxValues.length === 0 ? 0 : Math.max(...maxValues) + 1
  }

  function addCharge() {
    form.value.charges.push({
      type: selectedChargeTab.value,
      charge_type: 'amount',
      amount: 0,
      minimum_amount: nextMinimum(selectedChargeTab.value),
      maximum_amount: null,
    })
  }

  function removeCharge(index: number) {
    form.value.charges.splice(index, 1)
  }

  const chargeRows = computed(() =>
    form.value.charges.map((charge, index) => ({ charge, index })).filter((row) => row.charge.type === selectedChargeTab.value),
  )

  // Attaching a charge switches on evaluation of that activity.
  watch(
    () => form.value.charges.map((c) => c.type),
    (types) => {
      if (types.includes('deposit')) form.value.charge_on_deposit = true
      if (types.includes('withdraw')) form.value.charge_on_withdraw = true
      if (types.includes('transfer')) form.value.charge_on_transfer = true
    },
  )

  /** Activities with charges attached but evaluation switched off — those charges would never apply. */
  const activityWarnings = computed(() => {
    const types = new Set(form.value.charges.map((c) => c.type))
    const warnings: string[] = []
    if (types.has('deposit') && !form.value.charge_on_deposit) warnings.push('Deposit')
    if (types.has('withdraw') && !form.value.charge_on_withdraw) warnings.push('Withdraw')
    if (types.has('transfer') && !form.value.charge_on_transfer) warnings.push('Transfer')
    return warnings
  })

  const { monthlyFeeSummary } = useMonthlyFeeSummary(form)

  // ─── Save ─────────────────────────────────────────────────────────────────
  function payload(): SavingsProductSettings {
    const { id: _id, ...rest } = form.value
    const toNumber = (value: NumberLike | null | undefined) => Number(normalizeNumberInput(value)) || 0
    const charges: SavingsProductCharge[] = rest.charges.map((c) => ({
      ...(c.id ? { id: c.id } : {}),
      type: c.type,
      charge_type: c.charge_type,
      minimum_amount: toNumber(c.minimum_amount),
      maximum_amount: String(c.maximum_amount ?? '').trim() === '' ? null : toNumber(c.maximum_amount),
      amount: toNumber(c.amount),
    }))
    return { ...rest, charges }
  }

  async function save() {
    saving.value = true
    errors.value = {}
    message.value = ''
    try {
      const product = productId.value !== null
        ? await savingsProductsApi.update(productId.value, payload())
        : await savingsProductsApi.create(payload())
      onSaved(product)
    } catch (e) {
      if (e instanceof ApiError && e.isValidation) {
        errors.value = e.errors
        message.value = 'Please correct the highlighted fields.'
      } else {
        message.value = e instanceof ApiError ? e.message : 'Failed to save savings product.'
      }
    } finally {
      saving.value = false
    }
  }

  return {
    isEditing, loading, saving, message, form, selectedChargeTab,
    chartAccounts, products, liabilityAccounts, cashAccounts,
    chargeRows, activityWarnings, monthlyFeeSummary,
    open, fieldError, addCharge, removeCharge, save,
  }
}
