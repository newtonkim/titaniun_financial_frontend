<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Calculator, ChevronDown, ChevronUp } from 'lucide-vue-next'
import AppDrawer from '@/core/components/AppDrawer.vue'
import SearchableSelect from '@/core/components/SearchableSelect.vue'
import { formatMoney } from '@/core/utils/format'
import { ACCOUNT_FIELDS, useLoanProductForm } from '../composables/useLoanProductForm'
import type { LoanProduct } from '../types'

/** Create (`productId` null) or edit a loan product in a right-hand drawer. */
const props = defineProps<{ productId: number | null }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [product: LoanProduct] }>()

const {
  isEditing, loading, saving, message, form, loanCount, isInUse,
  accountsByType, estimatedFees,
  preview, previewLoading, previewAmount, previewTerm,
  open: load, fieldError, save,
} = useLoanProductForm(
  computed(() => props.productId),
  (product) => {
    emit('saved', product)
    open.value = false
  },
)

watch(open, (isOpen) => {
  if (isOpen) void load()
}, { immediate: true })

const title = computed(() => (isEditing.value ? 'Edit Loan Product' : 'Create Loan Product'))

const showAccountingMapping = ref(true)
const showFeesAndPenalties = ref(true)

const input = 'w-full rounded-lg border px-3 py-2 text-sm dark:bg-neutral-800 dark:text-white'
const inputClass = (field: string) => [input, fieldError(field) ? 'border-red-400 dark:border-red-500' : 'border-border']
const card = 'rounded-lg border border-border bg-background p-6'
const label = 'mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300'
const hint = 'mt-1 text-xs text-muted-foreground'
const money = (value: number | string | null | undefined) => formatMoney(value ?? 0)
</script>

<template>
  <AppDrawer
    v-model:open="open"
    :title="title"
    description="Configure pricing, repayment behavior, approval rules, penalties, and accounting mappings."
    width="w-full lg:w-1/2"
    :loading="saving"
    :save-disabled="loading"
    :save-button-text="isEditing ? 'Update' : 'Create'"
    @save="save"
  >
    <div v-if="loading" class="flex items-center justify-center py-20 text-sm text-muted-foreground">Loading…</div>

    <div v-else class="flex flex-col gap-6">
      <p v-if="message" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
        {{ message }}
      </p>

      <!-- Basic information -->
      <div :class="card">
        <h2 class="mb-5 text-base font-semibold text-foreground">Basic Information</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label :class="label" for="lp-name">Product Name <span class="text-red-500">*</span></label>
            <input id="lp-name" v-model="form.name" type="text" placeholder="e.g. Salary Advance Loan" :class="inputClass('name')" />
            <p v-if="fieldError('name')" class="mt-1 text-xs text-red-500">{{ fieldError('name') }}</p>
          </div>
          <div>
            <label :class="label" for="lp-code">Product Code</label>
            <input
              id="lp-code"
              :value="form.code"
              type="text"
              readonly
              class="w-full cursor-default rounded-lg border border-border bg-neutral-50 px-3 py-2 text-sm text-muted-foreground dark:bg-neutral-800/60"
            />
            <p :class="hint">Auto-generated from product name.</p>
            <p v-if="fieldError('code')" class="mt-1 text-xs text-red-500">{{ fieldError('code') }}</p>
          </div>
          <div class="sm:col-span-2">
            <label :class="label" for="lp-description">Description</label>
            <textarea
              id="lp-description"
              v-model="form.description"
              rows="3"
              placeholder="Short operational description for staff"
              class="w-full rounded-lg border border-border px-3 py-2 text-sm dark:bg-neutral-800 dark:text-white"
            />
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
            <span class="text-sm text-neutral-700 dark:text-neutral-300">{{ form.is_active ? 'Active product' : 'Draft / inactive product' }}</span>
            <span v-if="isInUse" class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              In use by {{ loanCount }} loans
            </span>
          </div>
        </div>
      </div>

      <!-- Amount and term -->
      <div :class="card">
        <h2 class="mb-5 text-base font-semibold text-foreground">Amount and Term</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label :class="label" for="lp-min">Minimum Amount</label>
            <input id="lp-min" v-model.number="form.min_amount" type="number" step="0.01" placeholder="0.00" :class="inputClass('min_amount')" />
            <p v-if="fieldError('min_amount')" class="mt-1 text-xs text-red-500">{{ fieldError('min_amount') }}</p>
          </div>
          <div>
            <label :class="label" for="lp-max">Maximum Amount (blank for no limit)</label>
            <input id="lp-max" v-model.number="form.max_amount" type="number" step="0.01" placeholder="0.00" :class="inputClass('max_amount')" />
            <p v-if="fieldError('max_amount')" class="mt-1 text-xs text-red-500">{{ fieldError('max_amount') }}</p>
          </div>
          <div>
            <label :class="label" for="lp-min-term">Minimum Term</label>
            <input id="lp-min-term" v-model.number="form.min_term" type="number" min="1" :class="inputClass('min_term')" />
            <p v-if="fieldError('min_term')" class="mt-1 text-xs text-red-500">{{ fieldError('min_term') }}</p>
          </div>
          <div>
            <label :class="label" for="lp-duration">Maximum Term</label>
            <input id="lp-duration" v-model.number="form.max_term" type="number" min="1" placeholder="e.g. 12" :class="inputClass('max_term')" />
            <p v-if="fieldError('max_term')" class="mt-1 text-xs text-red-500">{{ fieldError('max_term') }}</p>
          </div>
          <div>
            <label :class="label" for="lp-unit">Duration Unit</label>
            <select id="lp-unit" v-model="form.duration_type" :class="inputClass('duration_type')">
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
          <div>
            <label :class="label" for="lp-cycle">Repayment Cycle</label>
            <select id="lp-cycle" v-model="form.repayment_frequency" :class="inputClass('repayment_frequency')">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <p :class="hint">Period used to create repayment schedules eg payment is per week etc.</p>
          </div>
          <div>
            <label :class="label" for="lp-grace">Grace Period (days)</label>
            <input id="lp-grace" v-model.number="form.grace_period" type="number" min="0" placeholder="0" :class="inputClass('grace_period')" />
            <p :class="hint">Days beyond due date before the loan starts being paid.</p>
          </div>
          <div>
            <label :class="label" for="lp-warning">Warning Days</label>
            <input id="lp-warning" v-model.number="form.warning_days" type="number" min="0" placeholder="e.g. 7" :class="inputClass('warning_days')" />
            <p :class="hint">Days before due date to start sending repayment reminders.</p>
            <p v-if="fieldError('warning_days')" class="mt-1 text-xs text-red-500">{{ fieldError('warning_days') }}</p>
          </div>
        </div>
      </div>

      <!-- Interest -->
      <div :class="card">
        <h2 class="mb-5 text-base font-semibold text-foreground">Interest and Repayment Structure</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <p :class="label">Interest Method</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <button
                v-for="method in [
                  { value: 'flat', title: 'Flat Rate', text: 'Interest stays on original principal throughout the term.' },
                  { value: 'reducing_balance', title: 'Reducing Balance', text: 'Interest declines as the outstanding balance reduces.' },
                ] as const"
                :key="method.value"
                type="button"
                :aria-pressed="form.interest_method === method.value"
                class="rounded-lg border p-4 text-left transition-colors"
                :class="form.interest_method === method.value ? 'border-brand bg-brand/5' : 'border-border'"
                @click="form.interest_method = method.value"
              >
                <p class="text-sm font-semibold text-foreground">{{ method.title }}</p>
                <p class="mt-1 text-xs text-muted-foreground">{{ method.text }}</p>
              </button>
            </div>
            <p v-if="fieldError('interest_method')" class="mt-1 text-xs text-red-500">{{ fieldError('interest_method') }}</p>
          </div>
          <div>
            <label :class="label" for="lp-rate">Interest Rate (%)</label>
            <input id="lp-rate" v-model.number="form.interest_rate" type="number" min="0" step="0.01" placeholder="0.00" :class="inputClass('interest_rate')" />
            <p v-if="fieldError('interest_rate')" class="mt-1 text-xs text-red-500">{{ fieldError('interest_rate') }}</p>
          </div>
          <div v-if="form.interest_method === 'reducing_balance'">
            <label :class="label" for="lp-structure">Repayment Structure</label>
            <select id="lp-structure" v-model="form.repayment_structure" :class="inputClass('repayment_structure')">
              <option value="equal_installment">Equal Installments</option>
              <option value="equal_principal">Equal Principal</option>
              <option value="interest_only_balloon">Interest Only with Balloon</option>
            </select>
          </div>
          <div>
            <label :class="label" for="lp-period">Rate Period</label>
            <select id="lp-period" v-model="form.interest_period" :class="inputClass('interest_period')">
              <option value="per_month">Per Month</option>
              <option value="per_year">Per Year</option>
            </select>
          </div>
        </div>
      </div>

      <div :class="card">
        <h2 class="mb-3 text-base font-semibold text-foreground">Interest distribution</h2>
        <label :class="label" for="lp-commission">Commission share of collected interest (%)</label>
        <input id="lp-commission" v-model.number="form.commission_rate" type="number" min="0" max="100" step="0.01" :class="inputClass('commission_rate')" />
        <p v-if="fieldError('commission_rate')" class="mt-1 text-xs text-red-500">{{ fieldError('commission_rate') }}</p>
        <p :class="hint">Company retains {{ 100 - Number(form.commission_rate) }}%; the selected officer or referring guarantor earns {{ form.commission_rate }}%. Only collected interest qualifies. Payout is at quarter-end after the client fully clears the loan; unpaid commission carries forward. Principal and fees do not earn commission.</p>
      </div>

      <!-- Workflow and eligibility -->
      <div :class="card">
        <h2 class="mb-5 text-base font-semibold text-foreground">Workflow and Eligibility</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label :class="label" for="lp-appraisal">Savings Appraisal Threshold (%)</label>
            <div class="relative">
              <input id="lp-appraisal" v-model.number="form.savings_appraisal_threshold" type="number" min="0" max="100" step="0.01" placeholder="0" :class="[inputClass('savings_appraisal_threshold'), 'pr-10']" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            <p :class="hint">Percentage of applicant savings that does not require appraisal.</p>
            <p v-if="fieldError('savings_appraisal_threshold')" class="mt-1 text-xs text-red-500">{{ fieldError('savings_appraisal_threshold') }}</p>
          </div>
          <div>
            <label :class="label" for="lp-securities">Maximum Securities</label>
            <input id="lp-securities" v-model.number="form.max_securities" type="number" min="1" placeholder="3" :class="inputClass('max_securities')" />
            <p :class="hint">Maximum number of securities allowed for a loan.</p>
            <p v-if="fieldError('max_securities')" class="mt-1 text-xs text-red-500">{{ fieldError('max_securities') }}</p>
          </div>
          <div>
            <label :class="label" for="lp-security-value">Security Value (%)</label>
            <div class="relative">
              <input id="lp-security-value" v-model.number="form.security_value_percentage" type="number" min="0" step="0.01" placeholder="150" :class="[inputClass('security_value_percentage'), 'pr-10']" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            <p :class="hint">Required security value as a percentage of the loan amount.</p>
            <p v-if="fieldError('security_value_percentage')" class="mt-1 text-xs text-red-500">{{ fieldError('security_value_percentage') }}</p>
          </div>
        </div>
      </div>

      <!-- Fees and penalties -->
      <div :class="card">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-base font-semibold text-foreground">Fees and Penalties</h2>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
            :aria-expanded="showFeesAndPenalties"
            @click="showFeesAndPenalties = !showFeesAndPenalties"
          >
            <component :is="showFeesAndPenalties ? ChevronUp : ChevronDown" class="h-3.5 w-3.5" />
            {{ showFeesAndPenalties ? 'Hide' : 'Show' }}
          </button>
        </div>
        <template v-if="showFeesAndPenalties">
          <div class="mb-5 rounded-lg border border-border bg-neutral-50/70 p-3.5 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
            <p class="font-medium text-neutral-700 dark:text-neutral-200">Set the fees and penalties that apply to this loan product.</p>
            <ul class="mt-2 list-disc space-y-1.5 pl-4">
              <li><strong class="font-semibold">Processing fees:</strong> deducted at disbursement.</li>
              <li><strong class="font-semibold">Penalties:</strong> applied when members miss repayment deadlines.</li>
            </ul>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label :class="label" for="lp-fee-type">Processing Fee</label>
              <select id="lp-fee-type" v-model="form.processing_fee_type" :class="inputClass('processing_fee_type')">
                <option value="none">None</option>
                <option value="percentage">Percentage of principal</option>
                <option value="flat">Flat amount</option>
              </select>
            </div>
            <div v-if="form.processing_fee_type !== 'none'">
              <label :class="label" for="lp-fee-value">{{ form.processing_fee_type === 'percentage' ? 'Fee (%)' : 'Fee Amount' }}</label>
              <input id="lp-fee-value" v-model.number="form.processing_fee_value" type="number" min="0" step="0.01" :class="inputClass('processing_fee_value')" />
              <p v-if="fieldError('processing_fee_value')" class="mt-1 text-xs text-red-500">{{ fieldError('processing_fee_value') }}</p>
            </div>
            <div>
              <label :class="label" for="lp-penalty-type">Penalty</label>
              <select id="lp-penalty-type" v-model="form.penalty_type" :class="inputClass('penalty_type')">
                <option value="none">None</option>
                <option value="percentage">Percentage of overdue amount</option>
                <option value="percentage_per_day">Percentage per day overdue</option>
                <option value="flat">Flat amount</option>
              </select>
            </div>
            <div v-if="form.penalty_type !== 'none'">
              <label :class="label" for="lp-penalty-rate">{{ form.penalty_type === 'flat' ? 'Penalty Amount' : 'Penalty Rate (%)' }}</label>
              <input id="lp-penalty-rate" v-model.number="form.penalty_rate" type="number" min="0" step="0.01" :class="inputClass('penalty_rate')" />
              <p v-if="fieldError('penalty_rate')" class="mt-1 text-xs text-red-500">{{ fieldError('penalty_rate') }}</p>
            </div>
          </div>
          <div v-if="form.penalty_type !== 'none'" class="mt-5 rounded-lg border border-border p-4">
            <label :class="label" for="lp-penalty-grace">Penalty Grace Period (days)</label>
            <input id="lp-penalty-grace" v-model.number="form.penalty_grace_days" type="number" min="0" placeholder="0" :class="inputClass('penalty_grace_days')" />
            <p class="mt-1 text-xs text-muted-foreground">
              Number of days after a repayment due date before penalties begin. Set to 0 for immediate application.
            </p>
          </div>
        </template>
      </div>

      <!-- Accounting mapping -->
      <div :class="card">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-base font-semibold text-foreground">Accounting Mapping</h2>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
            :aria-expanded="showAccountingMapping"
            @click="showAccountingMapping = !showAccountingMapping"
          >
            <component :is="showAccountingMapping ? ChevronUp : ChevronDown" class="h-3.5 w-3.5" />
            {{ showAccountingMapping ? 'Hide' : 'Show' }}
          </button>
        </div>
        <template v-if="showAccountingMapping">
          <p class="mb-4 text-xs text-muted-foreground">
            These accounts define where journal entries are posted for loan transactions. Defaults are pre-filled from your
            chart of accounts — change them if needed.
          </p>
          <div class="grid gap-4 sm:grid-cols-2">
            <div v-for="meta in ACCOUNT_FIELDS" :key="meta.field">
              <p :class="label">{{ meta.label }}</p>
              <SearchableSelect
                v-model="form[meta.field]"
                :options="accountsByType[meta.type]"
                :placeholder="meta.placeholder"
                :error="fieldError(meta.field) ?? undefined"
              />
            </div>
          </div>
        </template>
      </div>

      <!-- Live preview -->
      <div :class="card">
        <div class="mb-4 flex items-center gap-2">
          <Calculator class="h-4 w-4 text-brand" />
          <h2 class="text-base font-semibold text-foreground">Live Preview</h2>
        </div>

        <div class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground" for="lp-preview-amount">Preview Amount</label>
              <input id="lp-preview-amount" v-model.number="previewAmount" type="number" min="0" step="0.01" placeholder="500000" :class="[input, 'border-border']" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground" for="lp-preview-term">Preview Term</label>
              <input id="lp-preview-term" v-model.number="previewTerm" type="number" min="1" placeholder="12" :class="[input, 'border-border']" />
            </div>
          </div>

          <div class="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/60">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Method Summary</p>
            <p class="mt-2 text-sm text-foreground">
              {{ form.interest_method === 'reducing_balance' ? 'Reducing balance' : form.interest_method === 'flat' ? 'Flat rate' : 'Select an interest method' }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              <span v-if="form.interest_method === 'reducing_balance' && form.repayment_structure === 'equal_installment'">Installments stay level while principal share rises over time.</span>
              <span v-else-if="form.interest_method === 'reducing_balance' && form.repayment_structure === 'equal_principal'">Principal stays fixed and total installments decline over time.</span>
              <span v-else-if="form.interest_method === 'flat'">Interest is spread on original principal for the full term.</span>
              <span v-else>Preview will update once the core pricing fields are filled in.</span>
            </p>
          </div>

          <div v-if="previewLoading" class="py-10 text-center text-sm text-muted-foreground">Calculating preview…</div>

          <template v-else-if="preview">
            <div class="grid gap-3">
              <div class="rounded-lg border border-border p-4">
                <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estimated Installment</p>
                <p class="mt-1 text-xl font-semibold text-foreground">{{ money(preview.installment_amount) }}</p>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-lg border border-border p-4">
                  <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Interest</p>
                  <p class="mt-1 text-base font-semibold text-foreground">{{ money(preview.total_interest) }}</p>
                </div>
                <div class="rounded-lg border border-border p-4">
                  <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Repayment</p>
                  <p class="mt-1 text-base font-semibold text-foreground">{{ money(preview.total_repayment) }}</p>
                </div>
              </div>
            </div>

            <div class="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/60">
              <p class="text-sm text-neutral-700 dark:text-neutral-300">Company interest share: <strong>{{ money(preview.company_interest ?? 0) }}</strong></p>
              <p class="mt-1 text-sm text-neutral-700 dark:text-neutral-300">Commission: <strong>{{ money(preview.commission_amount ?? 0) }}</strong>, earned on collection and payable at quarter-end after full loan clearance.</p>
            </div>

            <!-- Total cost of credit -->
            <div v-if="estimatedFees.breakdown.length" class="rounded-lg border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
              <p class="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">Total Cost of Credit</p>
              <div class="mt-3 space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-neutral-600 dark:text-neutral-400">Principal</span>
                  <span class="font-medium text-foreground">{{ money(Number(previewAmount || form.min_amount || 0)) }}</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-neutral-600 dark:text-neutral-400">Total Interest</span>
                  <span class="font-medium text-foreground">{{ money(preview.total_interest) }}</span>
                </div>
                <div v-for="fee in estimatedFees.breakdown" :key="fee.name" class="flex items-center justify-between text-sm">
                  <span class="text-neutral-600 dark:text-neutral-400">{{ fee.name }}</span>
                  <span class="font-medium text-foreground">{{ money(fee.amount) }}</span>
                </div>
                <div class="border-t border-amber-200 pt-2 dark:border-amber-800">
                  <div class="flex items-center justify-between text-sm font-semibold">
                    <span class="text-amber-800 dark:text-amber-300">Estimated Total Cost</span>
                    <span class="text-amber-900 dark:text-amber-200">
                      {{ money(Number(previewAmount || form.min_amount || 0) + Number(preview.total_interest || 0) + estimatedFees.totalFees) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Schedule Snapshot</p>
              <div class="max-h-80 overflow-y-auto rounded-lg border border-border">
                <table class="w-full text-xs">
                  <thead class="sticky top-0 bg-neutral-50 text-muted-foreground dark:bg-neutral-800">
                    <tr>
                      <th class="px-3 py-2 text-left">#</th>
                      <th class="px-3 py-2 text-right">Principal</th>
                      <th class="px-3 py-2 text-right">Interest</th>
                      <th class="px-3 py-2 text-right">Installment</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                    <tr v-for="row in preview.schedule_preview" :key="row.period">
                      <td class="px-3 py-2 text-neutral-700 dark:text-neutral-200">{{ row.period }}</td>
                      <td class="px-3 py-2 text-right text-neutral-600 dark:text-neutral-300">{{ money(row.principal) }}</td>
                      <td class="px-3 py-2 text-right text-neutral-600 dark:text-neutral-300">{{ money(row.interest) }}</td>
                      <td class="px-3 py-2 text-right font-medium text-foreground">{{ money(row.installment) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="preview.messages?.length" class="space-y-2">
              <p v-for="note in preview.messages" :key="note" class="text-xs text-muted-foreground">{{ note }}</p>
            </div>
          </template>

          <div v-else class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Fill in interest method, rate, term, and preview amount to generate a repayment sample.
          </div>
        </div>
      </div>
    </div>
  </AppDrawer>
</template>
