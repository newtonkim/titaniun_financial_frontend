<script setup lang="ts">
import { computed, watch } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import AppDrawer from '@/core/components/AppDrawer.vue'
import SearchableSelect from '@/core/components/SearchableSelect.vue'
import { CURRENCY } from '../composables/useMonthlyFeeSummary'
import { formatNumberInput, normalizeNumberInput, useSavingsProductForm } from '../composables/useSavingsProductForm'
import type { ChargeTrigger, SavingsProduct } from '../types'
import FdSettingsCard from './FdSettingsCard.vue'

/** Create (`productId` null) or edit a savings product in a right-hand drawer. */
const props = defineProps<{ productId: number | null }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [product: SavingsProduct] }>()

const {
  isEditing, loading, saving, message, form, selectedChargeTab,
  chartAccounts, products, liabilityAccounts, cashAccounts,
  chargeRows, activityWarnings, monthlyFeeSummary,
  open: load, fieldError, addCharge, removeCharge, save,
} = useSavingsProductForm(
  computed(() => props.productId),
  (product) => {
    emit('saved', product)
    open.value = false
  },
)

watch(open, (isOpen) => {
  if (isOpen) void load()
}, { immediate: true })

const title = computed(() => (isEditing.value ? 'Edit Savings Product' : 'Create Savings Product'))

const CHARGE_TABS: { value: ChargeTrigger; label: string }[] = [
  { value: 'deposit', label: 'Deposit charges' },
  { value: 'withdraw', label: 'Withdraw charges' },
  { value: 'transfer', label: 'Transfer charges' },
]

const ACTIVITIES = [
  { field: 'charge_on_deposit', label: 'Evaluate events on Deposit' },
  { field: 'charge_on_withdraw', label: 'Evaluate events on Withdraw' },
  { field: 'charge_on_transfer', label: 'Evaluate events on Transfer' },
] as const

const input = 'w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-white'
const inputClass = (field: string) => [input, fieldError(field) ? 'border-red-400 dark:border-red-500' : 'border-neutral-300 dark:border-neutral-700']
const cellInput = 'w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'
const card = 'rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900'
const label = 'mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300'
const step = 'rounded-full bg-navy px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white'
</script>

<template>
  <AppDrawer
    v-model:open="open"
    :title="title"
    width="w-full lg:w-1/2"
    :loading="saving"
    :save-disabled="loading"
    :save-button-text="isEditing ? 'Update' : 'Create'"
    @save="save"
  >
    <div v-if="loading" class="flex flex-col items-center justify-center gap-3 py-24">
      <span class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand border-r-transparent" aria-hidden="true" />
      <span class="text-sm font-medium text-neutral-500 dark:text-neutral-400">Loading details...</span>
    </div>

    <div v-else class="flex flex-col gap-6">
      <p v-if="message" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
        {{ message }}
      </p>

      <!-- General information -->
      <div :class="card">
        <h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">General Information</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label :class="label" for="sp-name">Name <span class="text-red-500">*</span></label>
            <input id="sp-name" v-model="form.name" type="text" :class="inputClass('name')" placeholder="e.g. Fixed Deposit 6 Months" />
            <p v-if="fieldError('name')" class="mt-1 text-xs text-red-500">{{ fieldError('name') }}</p>
          </div>

          <div>
            <label :class="label" for="sp-type">Type</label>
            <select id="sp-type" v-model="form.type" :class="inputClass('type')">
              <option value="fixed">Fixed</option>
              <option value="standard">Standard</option>
            </select>
          </div>

          <div>
            <label :class="label" for="sp-min-balance">Minimum Balance ({{ CURRENCY }})</label>
            <input id="sp-min-balance" v-model.number="form.minimum_balance" type="number" step="0.01" min="0" :class="inputClass('minimum_balance')" />
            <p v-if="fieldError('minimum_balance')" class="mt-1 text-xs text-red-500">{{ fieldError('minimum_balance') }}</p>
          </div>

          <div v-if="form.type === 'standard'">
            <label :class="label" for="sp-rate">Annual Interest Rate (%)</label>
            <input id="sp-rate" v-model.number="form.interest_rate" type="number" step="0.01" min="0" max="100" :class="inputClass('interest_rate')" />
            <p v-if="fieldError('interest_rate')" class="mt-1 text-xs text-red-500">{{ fieldError('interest_rate') }}</p>
          </div>

          <div v-if="form.type === 'fixed'">
            <label :class="label" for="sp-maturity">Min Maturity (Months)</label>
            <input id="sp-maturity" v-model.number="form.minimum_maturity_months" type="number" min="0" :class="inputClass('minimum_maturity_months')" />
            <p v-if="fieldError('minimum_maturity_months')" class="mt-1 text-xs text-red-500">{{ fieldError('minimum_maturity_months') }}</p>
          </div>

          <div>
            <label :class="label" for="sp-dormancy">Dormancy Period (Months)</label>
            <input id="sp-dormancy" v-model.number="form.dormancy_period_months" type="number" min="0" :class="inputClass('dormancy_period_months')" />
            <p v-if="fieldError('dormancy_period_months')" class="mt-1 text-xs text-red-500">{{ fieldError('dormancy_period_months') }}</p>
          </div>

          <div>
            <p :class="label">Deposits Liability Account</p>
            <SearchableSelect
              v-model="form.liability_account_id"
              :options="liabilityAccounts"
              placeholder="— select account —"
              :error="fieldError('liability_account_id') ?? undefined"
            />
          </div>

          <div>
            <p :class="label">Deposits Paid Into</p>
            <SearchableSelect
              v-model="form.cash_account_id"
              :options="cashAccounts"
              placeholder="— select account —"
              :error="fieldError('cash_account_id') ?? undefined"
            />
            <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">With both accounts set, deposits and withdrawals post to the ledger.</p>
          </div>

          <div class="sm:col-span-2">
            <label :class="label" for="sp-description">Description</label>
            <textarea id="sp-description" v-model="form.description" rows="2" :class="inputClass('description')" placeholder="Short operational description for staff" />
          </div>

          <div class="flex items-center gap-3 sm:col-span-2">
            <button
              type="button"
              role="switch"
              :aria-checked="form.is_active"
              aria-label="Active product"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :class="form.is_active ? 'bg-brand' : 'bg-neutral-200 dark:bg-neutral-700'"
              @click="form.is_active = !form.is_active"
            >
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform" :class="form.is_active ? 'translate-x-6' : 'translate-x-1'" />
            </button>
            <span class="text-sm text-neutral-700 dark:text-neutral-300">{{ form.is_active ? 'Active product' : 'Inactive product' }}</span>
          </div>
        </div>
      </div>

      <!-- Monthly fees -->
      <div :class="card">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">Monthly fees</h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">Configure compulsory monthly or maintenance fees.</p>
          </div>
          <label class="flex cursor-pointer items-center gap-2">
            <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enable</span>
            <span class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" :class="form.monthly_fee_enabled ? 'bg-brand' : 'bg-neutral-200 dark:bg-neutral-700'">
              <span class="inline-block h-4 w-4 transform rounded-full bg-white transition" :class="form.monthly_fee_enabled ? 'translate-x-6' : 'translate-x-1'" />
              <input v-model="form.monthly_fee_enabled" type="checkbox" class="sr-only" />
            </span>
          </label>
        </div>

        <div v-if="form.monthly_fee_enabled" class="mt-4 grid gap-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <div class="rounded-lg border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
            <div class="mb-3 flex items-center gap-2">
              <span :class="step">Step 1</span>
              <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">Choose fee type</h3>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label :class="label" for="sp-fee-type">Fee type</label>
                <select id="sp-fee-type" v-model="form.monthly_fee_type" :class="inputClass('monthly_fee_type')">
                  <option value="amount">Fixed amount</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
                <p v-if="fieldError('monthly_fee_type')" class="mt-1 text-xs text-red-500">{{ fieldError('monthly_fee_type') }}</p>
              </div>
              <div class="text-xs text-neutral-500 dark:text-neutral-400 sm:pt-7">
                Fixed amount charges a flat fee. Percentage charges a rate on end-of-month balance.
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div class="mb-3 flex items-center gap-2">
              <span :class="step">Step 2</span>
              <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">Set base fee (all members)</h3>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label :class="label" for="sp-fee-amount">Base fee amount</label>
                <input id="sp-fee-amount" v-model.number="form.monthly_fee_amount" type="number" step="0.01" min="0" :class="inputClass('monthly_fee_amount')" />
                <p v-if="fieldError('monthly_fee_amount')" class="mt-1 text-xs text-red-500">{{ fieldError('monthly_fee_amount') }}</p>
                <p v-else-if="form.monthly_fee_type === 'percentage'" class="mt-1 text-xs text-neutral-500">Calculated on end-of-month balance.</p>
              </div>
              <div class="rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                This fee is compulsory for all members using this product.
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div class="mb-3 flex items-center gap-2">
              <span :class="step">Step 3</span>
              <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">Select deduction timing</h3>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label :class="label" for="sp-fee-day">Deduction day</label>
                <select id="sp-fee-day" v-model.number="form.monthly_fee_deduction_day" :class="inputClass('monthly_fee_deduction_day')">
                  <option :value="1">1st of the month</option>
                  <option :value="15">15th of the month</option>
                  <option :value="28">28th of the month</option>
                  <option :value="31">End of month</option>
                </select>
              </div>
              <div class="text-xs text-neutral-500 dark:text-neutral-400 sm:pt-7">Fees are deducted once per month on the selected day.</div>
            </div>
          </div>

          <div class="rounded-lg border border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div class="mb-3 flex items-center gap-2">
              <span :class="step">Step 4</span>
              <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">Adjust fee for loyal members</h3>
            </div>
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enable loyalty adjustment</p>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">Offer a reduced or custom fee for loyal members.</p>
              </div>
              <label class="flex cursor-pointer items-center gap-2">
                <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enable</span>
                <span class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" :class="form.loyalty_fee_enabled ? 'bg-brand' : 'bg-neutral-200 dark:bg-neutral-700'">
                  <span class="inline-block h-4 w-4 transform rounded-full bg-white transition" :class="form.loyalty_fee_enabled ? 'translate-x-6' : 'translate-x-1'" />
                  <input v-model="form.loyalty_fee_enabled" type="checkbox" class="sr-only" />
                </span>
              </label>
            </div>

            <div v-if="form.loyalty_fee_enabled" class="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label :class="label" for="sp-loyalty-type">Adjustment type</label>
                <select id="sp-loyalty-type" v-model="form.loyalty_adjustment_type" :class="inputClass('loyalty_adjustment_type')">
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
                <input id="sp-loyalty-value" v-model.number="form.loyalty_adjustment_value" type="number" step="0.01" min="0" :class="inputClass('loyalty_adjustment_value')" />
                <p v-if="fieldError('loyalty_adjustment_value')" class="mt-1 text-xs text-red-500">{{ fieldError('loyalty_adjustment_value') }}</p>
                <p v-else-if="form.loyalty_adjustment_type === 'custom_fee' && form.monthly_fee_type === 'percentage'" class="mt-1 text-xs text-neutral-500">Uses the base fee format (percentage).</p>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-300">
            <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Summary</div>
            <div>{{ monthlyFeeSummary || 'Complete the steps above to see a summary.' }}</div>
          </div>
        </div>
      </div>

      <!-- Attached charges -->
      <div :class="card">
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

        <div class="mb-4 inline-flex flex-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-1 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          <button
            v-for="tab in CHARGE_TABS"
            :key="tab.value"
            type="button"
            class="rounded-md px-3 py-1.5 transition"
            :class="selectedChargeTab === tab.value ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'"
            @click="selectedChargeTab = tab.value"
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
              <tr v-for="(row, n) in chargeRows" :key="row.index" class="bg-white dark:bg-neutral-900">
                <td class="px-4 py-3 text-neutral-500">{{ n + 1 }}</td>
                <td class="px-4 py-3">
                  <input
                    :value="formatNumberInput(row.charge.minimum_amount)"
                    type="text"
                    readonly
                    :aria-label="`Charge ${n + 1} minimum`"
                    class="w-full min-w-24 cursor-not-allowed rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  />
                </td>
                <td class="px-4 py-3">
                  <input
                    v-model="row.charge.maximum_amount"
                    type="text"
                    inputmode="decimal"
                    :aria-label="`Charge ${n + 1} maximum`"
                    :class="[cellInput, 'min-w-24', fieldError(`charges.${row.index}.maximum_amount`) && 'border-red-400']"
                    @focus="row.charge.maximum_amount = normalizeNumberInput(row.charge.maximum_amount)"
                    @blur="row.charge.maximum_amount = formatNumberInput(row.charge.maximum_amount)"
                  />
                </td>
                <td class="px-4 py-3">
                  <input
                    v-model="row.charge.amount"
                    type="text"
                    inputmode="decimal"
                    :aria-label="`Charge ${n + 1} amount`"
                    :class="[cellInput, 'min-w-20', fieldError(`charges.${row.index}.amount`) && 'border-red-400']"
                    @focus="row.charge.amount = normalizeNumberInput(row.charge.amount)"
                    @blur="row.charge.amount = formatNumberInput(row.charge.amount)"
                  />
                </td>
                <td class="px-4 py-3">
                  <select v-model="row.charge.charge_type" :aria-label="`Charge ${n + 1} measure`" :class="[cellInput, 'min-w-32']">
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
            </tbody>
          </table>
        </div>

        <p v-if="chargeRows.length > 0" class="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          Next minimum auto-fills as previous maximum + 1 for the same transaction type.
        </p>
      </div>

      <!-- Fixed deposit settings -->
      <FdSettingsCard v-if="form.type === 'fixed'" :form="form" :products="products" :chart-accounts="chartAccounts" />

      <!-- Applies to activity -->
      <div :class="card">
        <h3 class="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">Applies To Activity</h3>
        <div v-if="activityWarnings.length" class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          <span class="font-semibold">Warning:</span>
          {{ activityWarnings.join(', ') }} {{ activityWarnings.length === 1 ? 'charge is' : 'charges are' }} attached but the activity toggle is off — those fees will never apply.
        </div>
        <div class="space-y-3">
          <label v-for="activity in ACTIVITIES" :key="activity.field" class="flex cursor-pointer items-center gap-3">
            <input v-model="form[activity.field]" type="checkbox" class="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-brand dark:border-neutral-600" />
            <span class="text-sm text-neutral-700 dark:text-neutral-300">{{ activity.label }}</span>
          </label>
        </div>
      </div>
    </div>
  </AppDrawer>
</template>
