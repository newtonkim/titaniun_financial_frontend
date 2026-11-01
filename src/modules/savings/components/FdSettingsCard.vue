<script setup lang="ts">
import { computed, watch } from 'vue'
import SearchableSelect from '@/core/components/SearchableSelect.vue'
import type { ChartOfAccount } from '@/modules/accounting/types'
import type { SavingsProduct, SavingsProductSettings } from '../types'

const props = defineProps<{
  form: SavingsProductSettings & { id?: number }
  products: SavingsProduct[]
  chartAccounts: ChartOfAccount[]
}>()

const showFrequency = computed(() => props.form.interest_payout_type === 'periodic_payout' || props.form.interest_payout_type === 'compound')
const showConvertProduct = computed(() => props.form.maturity_action === 'convert_to_savings')
const productOptions = computed(() => props.products.filter((p) => p.type === 'standard' && p.id !== props.form.id))

const options = (type: ChartOfAccount['type']) =>
  props.chartAccounts.filter((a) => a.type === type).map((a) => ({ id: a.id, name: `${a.code} — ${a.name}` }))
const expenseAccounts = computed(() => options('expense'))
const payableAccounts = computed(() => options('liability'))

// Suggest sensible defaults once the chart of accounts loads; never replaces a choice already made.
watch(
  () => props.chartAccounts,
  (accounts) => {
    if (!accounts.length) return
    if (!props.form.interest_expense_account_id) {
      const match = accounts.find((a) => a.type === 'expense' && a.name.toLowerCase().includes('interest expense on savings'))
      if (match) props.form.interest_expense_account_id = match.id
    }
    if (!props.form.interest_payable_account_id) {
      const match = accounts.find((a) => a.type === 'liability' && a.name.toLowerCase().includes('accrued interest'))
      if (match) props.form.interest_payable_account_id = match.id
    }
  },
  { immediate: true },
)

const inputClass =
  'w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground'
</script>

<template>
  <div class="rounded-lg border border-amber-200 bg-amber-50/40 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/10">
    <h2 class="mb-4 text-section text-heading">Fixed Deposit Settings</h2>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300" for="fd-rate">Annual Interest Rate (%)</label>
        <input id="fd-rate" v-model.number="form.interest_rate" type="number" step="0.01" min="0" max="100" :class="inputClass" placeholder="e.g. 12.00" />
        <p class="mt-1 text-xs text-muted-foreground">Enter as percentage, e.g. 12 for 12% p.a.</p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300" for="fd-tenor">Default Tenor (Months)</label>
        <input id="fd-tenor" v-model.number="form.default_tenor_months" type="number" min="1" :class="inputClass" placeholder="e.g. 6" />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300" for="fd-payout">Interest Payout Type</label>
        <select id="fd-payout" v-model="form.interest_payout_type" :class="inputClass">
          <option value="at_maturity">At Maturity (lump sum)</option>
          <option value="periodic_payout">Periodic Payout (to savings)</option>
          <option value="compound">Compound (add to principal)</option>
        </select>
      </div>

      <div v-if="showFrequency">
        <label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300" for="fd-frequency">Posting Frequency</label>
        <select id="fd-frequency" v-model="form.interest_posting_frequency" :class="inputClass">
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="semi_annually">Semi-Annually</option>
          <option value="annually">Annually</option>
        </select>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300" for="fd-maturity">Default Maturity Action</label>
        <select id="fd-maturity" v-model="form.maturity_action" :class="inputClass">
          <option value="manual">Manual (officer action required)</option>
          <option value="auto_rollover">Auto Rollover (same product)</option>
          <option value="convert_to_savings">Convert to Savings</option>
        </select>
      </div>

      <div v-if="showConvertProduct">
        <label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300" for="fd-convert">Target Savings Product</label>
        <select id="fd-convert" v-model.number="form.convert_to_product_id" :class="inputClass">
          <option :value="null">— select product —</option>
          <option v-for="p in productOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>

      <div>
        <p class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Interest Expense GL Account (DR)</p>
        <SearchableSelect v-model="form.interest_expense_account_id" :options="expenseAccounts" placeholder="— select account —" />
      </div>

      <div>
        <p class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Interest Payable GL Account (CR)</p>
        <SearchableSelect v-model="form.interest_payable_account_id" :options="payableAccounts" placeholder="— select account —" />
      </div>
    </div>
  </div>
</template>
