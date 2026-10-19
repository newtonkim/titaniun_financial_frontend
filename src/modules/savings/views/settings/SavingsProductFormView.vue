<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowLeft, Landmark, Plus, Save, X } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/core/api/http'
import SearchableSelect from '@/core/components/SearchableSelect.vue'
import { chartOfAccountsApi } from '@/modules/accounting/api'
import type { ChartOfAccount } from '@/modules/accounting/types'
import { savingsProductsApi } from '../../api'
import FdSettingsCard from '../../components/FdSettingsCard.vue'
import { CURRENCY, useMonthlyFeeSummary } from '../../composables/useMonthlyFeeSummary'
import type { ChargeTrigger, SavingsProduct, SavingsProductCharge, SavingsProductSettings } from '../../types'

const route = useRoute()
const router = useRouter()

const isEditing = computed(() => route.params.id !== undefined)
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errors = ref<Record<string, string[]>>({})
const selectedChargeTab = ref<ChargeTrigger>('deposit')
const chartAccounts = ref<ChartOfAccount[]>([])
const savingsProductList = ref<SavingsProduct[]>([])

const form = ref<SavingsProductSettings & { id?: number }>({
  name: '',
  type: 'fixed',
  interest_rate: 0,
  minimum_balance: 0,
  minimum_maturity_months: 0,
  dormancy_period_months: 6,
  charge_on_deposit: false,
  charge_on_withdraw: false,
  charge_on_transfer: false,
  is_active: true,
  monthly_fee_enabled: false,
  monthly_fee_type: 'amount',
  monthly_fee_amount: null,
  monthly_fee_deduction_day: 1,
  loyalty_fee_enabled: false,
  loyalty_adjustment_type: 'discount_percentage',
  loyalty_adjustment_value: null,
  charges: [],
  // Fixed deposit settings, ignored by the backend checks for standard products.
  interest_payout_type: 'at_maturity',
  interest_posting_frequency: 'monthly',
  default_tenor_months: 6,
  maturity_action: 'manual',
  convert_to_product_id: null,
  liability_account_id: null,
  interest_expense_account_id: null,
  interest_payable_account_id: null,
})

const liabilityAccounts = computed(() =>
  chartAccounts.value.filter((a) => a.type === 'liability').map((a) => ({ id: a.id, name: `${a.code} — ${a.name}` })),
)

function fieldError(field: string): string | null {
  return errors.value[field]?.[0] ?? null
}

async function loadProduct() {
  if (!isEditing.value) return

  loading.value = true
  try {
    const product = await savingsProductsApi.show(Number(route.params.id))
    form.value = { ...form.value, ...product, charges: product.charges ?? [] }
  } catch {
    void router.push({ name: 'savings.products' })
  } finally {
    loading.value = false
  }
}

async function loadSupportingData() {
  try {
    const [accounts, products] = await Promise.all([
      chartOfAccountsApi.list({ is_active: true }),
      savingsProductsApi.list({ per_page: 100 }),
    ])
    chartAccounts.value = accounts.data.filter((a) => a.is_postable)
    savingsProductList.value = products.data
  } catch {
    // Non-fatal: the account and product pickers stay empty.
  }
}

onMounted(() => {
  void loadProduct()
  void loadSupportingData()
})

const normalizeNumberInput = (value: number | string | null | undefined) =>
  value === null || value === undefined ? '' : String(value).replace(/,/g, '')

function formatNumberInput(value: number | string | null | undefined): string {
  const normalized = normalizeNumberInput(value)
  if (normalized === '') return ''
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? normalized : new Intl.NumberFormat('en-US').format(parsed)
}

/** A new band starts just above the highest maximum of the same activity. */
function getNextMinimum(type: ChargeTrigger): number {
  const maxValues = form.value.charges
    .filter((charge) => charge.type === type)
    .map((charge) => Number(normalizeNumberInput(charge.maximum_amount)))
    .filter((value) => Number.isFinite(value) && value > 0)

  return maxValues.length === 0 ? 0 : Math.max(...maxValues) + 1
}

function addCharge() {
  form.value.charges.push({
    type: selectedChargeTab.value,
    charge_type: 'amount',
    amount: 0,
    minimum_amount: getNextMinimum(selectedChargeTab.value),
    maximum_amount: null,
  })
}

function removeCharge(index: number) {
  form.value.charges.splice(index, 1)
}

const chargeRows = computed(() =>
  form.value.charges
    .map((charge, index) => ({ charge, index }))
    .filter((row) => row.charge.type === selectedChargeTab.value),
)

// Switch an activity on when a charge for it is added.
watch(
  () => form.value.charges,
  (charges) => {
    if (charges.some((c) => c.type === 'deposit')) form.value.charge_on_deposit = true
    if (charges.some((c) => c.type === 'withdraw')) form.value.charge_on_withdraw = true
    if (charges.some((c) => c.type === 'transfer')) form.value.charge_on_transfer = true
  },
  { deep: true },
)

/** Activities that have charges but are switched off, so those charges would never apply. */
const activityWarnings = computed(() => {
  const charges = form.value.charges
  const warnings: string[] = []
  if (charges.some((c) => c.type === 'deposit') && !form.value.charge_on_deposit) warnings.push('Deposit')
  if (charges.some((c) => c.type === 'withdraw') && !form.value.charge_on_withdraw) warnings.push('Withdraw')
  if (charges.some((c) => c.type === 'transfer') && !form.value.charge_on_transfer) warnings.push('Transfer')
  return warnings
})

/** Errors on charge bands, keyed by the band's position in the full list. */
const chargeErrors = computed(() => {
  const byIndex: Record<number, string> = {}
  for (const [key, messages] of Object.entries(errors.value)) {
    const match = /^charges\.(\d+)\./.exec(key)
    if (match) byIndex[Number(match[1])] ??= messages[0] ?? ''
  }
  return byIndex
})

async function saveProduct() {
  saving.value = true
  message.value = ''
  errors.value = {}
  try {
    const payload: SavingsProductSettings = {
      ...form.value,
      charges: form.value.charges.map((c): SavingsProductCharge => ({
        ...c,
        minimum_amount: Number(normalizeNumberInput(c.minimum_amount)) || 0,
        maximum_amount: c.maximum_amount !== null && String(c.maximum_amount).trim() !== '' ? Number(normalizeNumberInput(c.maximum_amount)) : null,
        amount: Number(normalizeNumberInput(c.amount)) || 0,
      })),
    }
    if (isEditing.value) {
      await savingsProductsApi.update(Number(route.params.id), payload)
    } else {
      await savingsProductsApi.create(payload)
    }
    void router.push({ name: 'savings.products' })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors
      message.value = Object.values(e.errors)[0]?.[0] ?? e.message
    } else {
      message.value = e instanceof ApiError ? e.message : 'Failed to save savings product'
    }
  } finally {
    saving.value = false
  }
}

const { monthlyFeeSummary } = useMonthlyFeeSummary(form)

const inputClass = 'w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:text-white'
const label = 'mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300'
const stepBadge = 'rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white'
const tabClass = (tab: ChargeTrigger) =>
  selectedChargeTab.value === tab
    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
    : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
</script>

<template>
  <div class="tw-scope flex h-full flex-1 flex-col gap-6">
    <div class="flex items-center gap-3">
      <RouterLink :to="{ name: 'savings.products' }" aria-label="Back" class="mr-2 rounded-full p-2 transition hover:bg-neutral-200 dark:hover:bg-neutral-800">
        <ArrowLeft class="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
      </RouterLink>
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
        <Landmark class="h-5 w-5 text-brand" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          {{ isEditing ? 'Edit Savings Product' : 'Create Savings Product' }}
        </h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">Configure parameters and attach charges</p>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center gap-3 py-24">
      <span class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand border-r-transparent" aria-hidden="true" />
      <span class="text-sm font-medium text-neutral-500 dark:text-neutral-400">Loading details...</span>
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div class="flex flex-col gap-6">
        <p v-if="message" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
          {{ message }}
        </p>

        <!-- General information -->
        <div class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">General Information</h2>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label :class="label" for="sp-name">Name</label>
              <input id="sp-name" v-model="form.name" type="text" :class="inputClass" placeholder="e.g. Fixed Deposit 6 Months" />
              <p v-if="fieldError('name')" class="mt-1 text-xs text-red-500">{{ fieldError('name') }}</p>
            </div>

            <div>
              <label :class="label" for="sp-type">Type</label>
              <select id="sp-type" v-model="form.type" :class="inputClass">
                <option value="fixed">Fixed</option>
                <option value="standard">Standard</option>
              </select>
            </div>

            <div>
              <label :class="label" for="sp-min-balance">Minimum Balance ({{ CURRENCY }})</label>
              <input id="sp-min-balance" v-model.number="form.minimum_balance" type="number" step="0.01" :class="inputClass" />
              <p v-if="fieldError('minimum_balance')" class="mt-1 text-xs text-red-500">{{ fieldError('minimum_balance') }}</p>
            </div>

            <div v-if="form.type === 'fixed'">
              <label :class="label" for="sp-maturity">Min Maturity (Months)</label>
              <input id="sp-maturity" v-model.number="form.minimum_maturity_months" type="number" :class="inputClass" />
            </div>

            <div v-else>
              <label :class="label" for="sp-rate">Interest Rate (% p.a.)</label>
              <input id="sp-rate" v-model.number="form.interest_rate" type="number" step="0.01" min="0" max="100" :class="inputClass" />
              <p v-if="fieldError('interest_rate')" class="mt-1 text-xs text-red-500">{{ fieldError('interest_rate') }}</p>
            </div>

            <div>
              <label :class="label" for="sp-dormancy">Dormancy Period (Months)</label>
              <input id="sp-dormancy" v-model.number="form.dormancy_period_months" type="number" :class="inputClass" />
            </div>

            <div class="sm:col-span-2">
              <p :class="label">Deposits Liability Account</p>
              <SearchableSelect
                v-model="form.liability_account_id"
                :options="liabilityAccounts"
                placeholder="— select account —"
                :error="fieldError('liability_account_id') ?? undefined"
              />
              <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">The ledger account members' balances on this product are held in.</p>
            </div>
          </div>
        </div>

        <!-- Monthly fees -->
        <div class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">Monthly fees</h2>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">Configure compulsory monthly or maintenance fees.</p>
            </div>
            <label class="flex cursor-pointer items-center gap-2">
              <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enable</span>
              <span
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out"
                :class="form.monthly_fee_enabled ? 'bg-brand' : 'bg-neutral-200 dark:bg-neutral-700'"
              >
                <span class="inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out" :class="form.monthly_fee_enabled ? 'translate-x-6' : 'translate-x-1'" />
                <input v-model="form.monthly_fee_enabled" type="checkbox" class="sr-only" aria-label="Enable monthly fees" />
              </span>
            </label>
          </div>

          <div v-if="form.monthly_fee_enabled" class="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <div class="grid gap-4">
              <div class="rounded-lg border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
                <div class="mb-3 flex items-center gap-2">
                  <span :class="stepBadge">Step 1</span>
                  <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">Choose fee type</h3>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label :class="label" for="sp-fee-type">Fee type</label>
                    <select id="sp-fee-type" v-model="form.monthly_fee_type" :class="inputClass">
                      <option value="amount">Fixed amount</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                    <p v-if="fieldError('monthly_fee_type')" class="mt-1 text-xs text-red-500">{{ fieldError('monthly_fee_type') }}</p>
                  </div>
                  <div class="text-xs text-neutral-500 sm:pt-7 dark:text-neutral-400">
                    Fixed amount charges a flat fee. Percentage charges a rate on end-of-month balance.
                  </div>
                </div>
              </div>

              <div class="rounded-lg border border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div class="mb-3 flex items-center gap-2">
                  <span :class="stepBadge">Step 2</span>
                  <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">Set base fee (all members)</h3>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label :class="label" for="sp-fee-amount">Base fee amount</label>
                    <input id="sp-fee-amount" v-model.number="form.monthly_fee_amount" type="number" step="0.01" :class="inputClass" />
                    <p v-if="form.monthly_fee_type === 'percentage'" class="mt-1 text-xs text-neutral-500">Calculated on end-of-month balance.</p>
                    <p v-if="fieldError('monthly_fee_amount')" class="mt-1 text-xs text-red-500">{{ fieldError('monthly_fee_amount') }}</p>
                  </div>
                  <div class="rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                    This fee is compulsory for all members using this product.
                  </div>
                </div>
              </div>

              <div class="rounded-lg border border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div class="mb-3 flex items-center gap-2">
                  <span :class="stepBadge">Step 3</span>
                  <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">Select deduction timing</h3>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label :class="label" for="sp-fee-day">Deduction day</label>
                    <select id="sp-fee-day" v-model.number="form.monthly_fee_deduction_day" :class="inputClass">
                      <option :value="1">1st of the month</option>
                      <option :value="15">15th of the month</option>
                      <option :value="28">28th of the month</option>
                      <option :value="31">End of month</option>
                    </select>
                  </div>
                  <div class="text-xs text-neutral-500 sm:pt-7 dark:text-neutral-400">Fees are deducted once per month on the selected day.</div>
                </div>
              </div>

              <div class="rounded-lg border border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div class="mb-3 flex items-center gap-2">
                  <span :class="stepBadge">Step 4</span>
                  <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">Adjust fee for loyal members</h3>
                </div>

                <div class="flex items-center justify-between gap-4">
                  <div>
                    <p class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enable loyalty adjustment</p>
                    <p class="text-xs text-neutral-500 dark:text-neutral-400">Offer a reduced or custom fee for loyal members.</p>
                  </div>
                  <label class="flex cursor-pointer items-center gap-2">
                    <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enable</span>
                    <span
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out"
                      :class="form.loyalty_fee_enabled ? 'bg-brand' : 'bg-neutral-200 dark:bg-neutral-700'"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out" :class="form.loyalty_fee_enabled ? 'translate-x-6' : 'translate-x-1'" />
                      <input v-model="form.loyalty_fee_enabled" type="checkbox" class="sr-only" aria-label="Enable loyalty adjustment" />
                    </span>
                  </label>
                </div>

                <div v-if="form.loyalty_fee_enabled" class="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label :class="label" for="sp-loyalty-type">Adjustment type</label>
                    <select id="sp-loyalty-type" v-model="form.loyalty_adjustment_type" :class="inputClass">
                      <option value="discount_percentage">Reduced by percentage</option>
                      <option value="fixed_discount">Fixed discount</option>
                      <option value="custom_fee">Custom fee</option>
                    </select>
                  </div>
                  <div>
                    <label :class="label" for="sp-loyalty-value">
                      <span v-if="form.loyalty_adjustment_type === 'discount_percentage'">Discount (%)</span>
                      <span v-else-if="form.loyalty_adjustment_type === 'fixed_discount'">Discount amount</span>
                      <span v-else>Custom fee amount</span>
                    </label>
                    <input id="sp-loyalty-value" v-model.number="form.loyalty_adjustment_value" type="number" step="0.01" :class="inputClass" />
                    <p v-if="form.loyalty_adjustment_type === 'custom_fee' && form.monthly_fee_type === 'percentage'" class="mt-1 text-xs text-neutral-500">Uses the base fee format (percentage).</p>
                    <p v-if="fieldError('loyalty_adjustment_value')" class="mt-1 text-xs text-red-500">{{ fieldError('loyalty_adjustment_value') }}</p>
                  </div>
                </div>
              </div>

              <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-300">
                <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Summary</div>
                <div>{{ monthlyFeeSummary || 'Complete the steps above to see a summary.' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Attached charges -->
        <div class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">Attached Charges</h2>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">Define charge ranges per transaction type.</p>
            </div>
            <button type="button" class="flex items-center justify-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-navy/90" @click="addCharge">
              <Plus class="h-3.5 w-3.5" />
              Add Charge
            </button>
          </div>

          <div class="mb-4 inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-1 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" role="tablist">
            <button
              v-for="tab in [{ key: 'deposit', label: 'Deposit charges' }, { key: 'withdraw', label: 'Withdraw charges' }, { key: 'transfer', label: 'Transfer charges' }] as const"
              :key="tab.key"
              type="button"
              role="tab"
              :aria-selected="selectedChargeTab === tab.key"
              class="rounded-md px-3 py-1.5 transition"
              :class="tabClass(tab.key)"
              @click="selectedChargeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>

          <div v-if="chargeRows.length === 0" class="rounded-xl border-2 border-dashed border-neutral-100 py-6 text-center text-sm text-neutral-500 dark:border-neutral-800">
            No charges added yet.
          </div>

          <div v-else class="overflow-x-auto rounded-xl border border-neutral-100 dark:border-neutral-800">
            <table class="min-w-full text-sm">
              <thead class="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold">S/N</th>
                  <th class="px-4 py-3 text-left font-semibold">Minimum</th>
                  <th class="px-4 py-3 text-left font-semibold">Maximum</th>
                  <th class="px-4 py-3 text-left font-semibold">Charge</th>
                  <th class="px-4 py-3 text-left font-semibold">Charge measure</th>
                  <th class="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                <template v-for="(row, position) in chargeRows" :key="row.index">
                  <tr class="bg-white dark:bg-neutral-900">
                    <td class="px-4 py-3 text-neutral-500">{{ position + 1 }}</td>
                    <td class="px-4 py-3">
                      <input
                        v-model="row.charge.minimum_amount"
                        type="text"
                        inputmode="decimal"
                        readonly
                        aria-label="Minimum amount"
                        class="w-full cursor-not-allowed rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                      />
                    </td>
                    <td class="px-4 py-3">
                      <input
                        v-model="row.charge.maximum_amount"
                        type="text"
                        inputmode="decimal"
                        aria-label="Maximum amount"
                        placeholder="No limit"
                        class="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                        @focus="row.charge.maximum_amount = normalizeNumberInput(row.charge.maximum_amount)"
                        @blur="row.charge.maximum_amount = formatNumberInput(row.charge.maximum_amount)"
                      />
                    </td>
                    <td class="px-4 py-3">
                      <input
                        v-model="row.charge.amount"
                        type="text"
                        inputmode="decimal"
                        aria-label="Charge"
                        class="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                        @focus="row.charge.amount = normalizeNumberInput(row.charge.amount)"
                        @blur="row.charge.amount = formatNumberInput(row.charge.amount)"
                      />
                    </td>
                    <td class="px-4 py-3">
                      <select v-model="row.charge.charge_type" aria-label="Charge measure" class="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                        <option value="amount">Fixed amount</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </td>
                    <td class="px-4 py-3">
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:border-red-200 hover:text-red-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-red-400"
                        @click="removeCharge(row.index)"
                      >
                        <X class="h-3 w-3" />
                        Remove
                      </button>
                    </td>
                  </tr>
                  <tr v-if="chargeErrors[row.index]">
                    <td colspan="6" class="px-4 pb-3 text-xs text-red-500">{{ chargeErrors[row.index] }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <p v-if="chargeRows.length > 0" class="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
            Next minimum auto-fills as previous maximum + 1 for the same transaction type.
          </p>
        </div>

        <!-- Fixed deposit settings -->
        <FdSettingsCard v-if="form.type === 'fixed'" :form="form" :products="savingsProductList" :chart-accounts="chartAccounts" />
      </div>

      <!-- Side panel -->
      <div class="flex flex-col gap-6">
        <div class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h3 class="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">Applies To Activity</h3>

          <div v-if="activityWarnings.length" class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            <span class="font-semibold">Warning:</span>
            {{ activityWarnings.join(', ') }} {{ activityWarnings.length === 1 ? 'charge is' : 'charges are' }} attached but the activity toggle is off — those fees will never apply.
          </div>

          <div class="space-y-3">
            <label class="flex items-center gap-3">
              <input v-model="form.charge_on_deposit" type="checkbox" class="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-brand" />
              <span class="text-sm text-neutral-700 dark:text-neutral-300">Evaluate events on Deposit</span>
            </label>
            <label class="flex items-center gap-3">
              <input v-model="form.charge_on_withdraw" type="checkbox" class="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-brand" />
              <span class="text-sm text-neutral-700 dark:text-neutral-300">Evaluate events on Withdraw</span>
            </label>
            <label class="flex items-center gap-3">
              <input v-model="form.charge_on_transfer" type="checkbox" class="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-brand" />
              <span class="text-sm text-neutral-700 dark:text-neutral-300">Evaluate events on Transfer</span>
            </label>
          </div>
        </div>

        <div class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <button
            type="button"
            :disabled="saving"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-navy/90 disabled:opacity-50"
            @click="saveProduct"
          >
            <Save v-if="!saving" class="h-4 w-4" />
            <span>{{ saving ? 'Saving Product...' : isEditing ? 'Update Savings Product' : 'Create Savings Product' }}</span>
          </button>
          <RouterLink
            :to="{ name: 'savings.products' }"
            class="mt-3 block w-full rounded-xl bg-neutral-100 px-4 py-3 text-center text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            Cancel
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
