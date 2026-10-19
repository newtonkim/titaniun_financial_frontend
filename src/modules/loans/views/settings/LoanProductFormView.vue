<script setup lang="ts">
import { ref } from 'vue'
import { ArrowLeft, Calculator, ChevronDown, ChevronUp, CreditCard, Save } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { formatMoney } from '@/core/utils/format'
import SearchableSelect from '@/core/components/SearchableSelect.vue'
import { ACCOUNT_FIELDS, useLoanProductForm } from '../../composables/useLoanProductForm'

const router = useRouter()

const {
  isEditing, loading, saving, message, form, loanCount, isInUse,
  accountsByType, estimatedFees,
  preview, previewLoading, previewAmount, previewTerm,
  fieldError, save,
} = useLoanProductForm()

const showAccountingMapping = ref(true)
const showFeesAndPenalties = ref(true)

const input = 'w-full rounded-xl border px-3 py-2 text-sm dark:bg-neutral-800 dark:text-white'
const inputClass = (field: string) => [input, fieldError(field) ? 'border-red-400 dark:border-red-500' : 'border-neutral-200 dark:border-neutral-700']
const card = 'rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900'
const label = 'mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300'
const hint = 'mt-1 text-xs text-neutral-400 dark:text-neutral-500'
const money = (value: number | string | null | undefined) => formatMoney(value ?? 0)
</script>

<template>
  <div class="tw-scope flex h-full flex-1 flex-col gap-6">
    <div class="flex items-center gap-3">
      <button
        type="button"
        aria-label="Back"
        class="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
        @click="router.back()"
      >
        <ArrowLeft class="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
      </button>
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
        <CreditCard class="h-5 w-5 text-brand" />
      </div>
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          {{ isEditing ? 'Edit Loan Product' : 'Create Loan Product' }}
        </h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">
          Configure pricing, repayment behavior, approval rules, penalties, and accounting mappings.
        </p>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20 text-sm text-neutral-400">Loading…</div>

    <form v-else class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" novalidate @submit.prevent="save">
      <div class="flex flex-col gap-6">
        <p v-if="message" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
          {{ message }}
        </p>

        <!-- Basic information -->
        <div :class="card">
          <h2 class="mb-5 text-base font-semibold text-neutral-900 dark:text-white">Basic Information</h2>
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
                class="w-full cursor-default rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400"
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
                class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
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
          <h2 class="mb-5 text-base font-semibold text-neutral-900 dark:text-white">Amount and Term</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label :class="label" for="lp-min">Minimum Amount</label>
              <input id="lp-min" v-model.number="form.min_amount" type="number" step="0.01" placeholder="0.00" :class="inputClass('min_amount')" />
              <p v-if="fieldError('min_amount')" class="mt-1 text-xs text-red-500">{{ fieldError('min_amount') }}</p>
            </div>
            <div>
              <label :class="label" for="lp-max">Maximum Amount</label>
              <input id="lp-max" v-model.number="form.max_amount" type="number" step="0.01" placeholder="0.00" :class="inputClass('max_amount')" />
              <p v-if="fieldError('max_amount')" class="mt-1 text-xs text-red-500">{{ fieldError('max_amount') }}</p>
            </div>
            <div>
              <label :class="label" for="lp-duration">Loan Duration</label>
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
          <h2 class="mb-5 text-base font-semibold text-neutral-900 dark:text-white">Interest and Repayment Structure</h2>
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
                  class="rounded-2xl border p-4 text-left transition-colors"
                  :class="form.interest_method === method.value ? 'border-brand bg-brand/5' : 'border-neutral-200 dark:border-neutral-700'"
                  @click="form.interest_method = method.value"
                >
                  <p class="text-sm font-semibold text-neutral-900 dark:text-white">{{ method.title }}</p>
                  <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{{ method.text }}</p>
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

        <!-- Workflow and eligibility -->
        <div :class="card">
          <h2 class="mb-5 text-base font-semibold text-neutral-900 dark:text-white">Workflow and Eligibility</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label :class="label" for="lp-appraisal">Savings Appraisal Threshold (%)</label>
              <div class="relative">
                <input id="lp-appraisal" v-model.number="form.savings_appraisal_threshold" type="number" min="0" max="100" step="0.01" placeholder="0" :class="[inputClass('savings_appraisal_threshold'), 'pr-10']" />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">%</span>
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
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">%</span>
              </div>
              <p :class="hint">Required security value as a percentage of the loan amount.</p>
              <p v-if="fieldError('security_value_percentage')" class="mt-1 text-xs text-red-500">{{ fieldError('security_value_percentage') }}</p>
            </div>
          </div>
        </div>

        <!-- Fees and penalties -->
        <div :class="card">
          <div class="mb-5 flex items-center justify-between">
            <h2 class="text-base font-semibold text-neutral-900 dark:text-white">Fees and Penalties</h2>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              :aria-expanded="showFeesAndPenalties"
              @click="showFeesAndPenalties = !showFeesAndPenalties"
            >
              <component :is="showFeesAndPenalties ? ChevronUp : ChevronDown" class="h-3.5 w-3.5" />
              {{ showFeesAndPenalties ? 'Hide' : 'Show' }}
            </button>
          </div>
          <template v-if="showFeesAndPenalties">
            <div class="mb-5 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300">
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
            <div v-if="form.penalty_type !== 'none'" class="mt-5 rounded-xl border border-neutral-100 p-4 dark:border-neutral-800">
              <label :class="label" for="lp-penalty-grace">Penalty Grace Period (days)</label>
              <input id="lp-penalty-grace" v-model.number="form.penalty_grace_days" type="number" min="0" placeholder="0" :class="inputClass('penalty_grace_days')" />
              <p class="mt-1 text-xs text-neutral-400">
                Number of days after a repayment due date before penalties begin. Set to 0 for immediate application.
              </p>
            </div>
          </template>
        </div>

        <!-- Accounting mapping -->
        <div :class="card">
          <div class="mb-5 flex items-center justify-between">
            <h2 class="text-base font-semibold text-neutral-900 dark:text-white">Accounting Mapping</h2>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              :aria-expanded="showAccountingMapping"
              @click="showAccountingMapping = !showAccountingMapping"
            >
              <component :is="showAccountingMapping ? ChevronUp : ChevronDown" class="h-3.5 w-3.5" />
              {{ showAccountingMapping ? 'Hide' : 'Show' }}
            </button>
          </div>
          <template v-if="showAccountingMapping">
            <p class="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
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

        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            @click="router.back()"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
            :disabled="saving"
          >
            <Save class="h-4 w-4" />
            {{ saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Product' }}
          </button>
        </div>
      </div>

      <!-- Live preview -->
      <div class="space-y-6">
        <div class="sticky top-24 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div class="mb-4 flex items-center gap-2">
            <Calculator class="h-4 w-4 text-brand" />
            <h2 class="text-base font-semibold text-neutral-900 dark:text-white">Live Preview</h2>
          </div>

          <div class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400" for="lp-preview-amount">Preview Amount</label>
                <input id="lp-preview-amount" v-model.number="previewAmount" type="number" min="0" step="0.01" placeholder="500000" :class="[input, 'border-neutral-200 dark:border-neutral-700']" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400" for="lp-preview-term">Preview Term</label>
                <input id="lp-preview-term" v-model.number="previewTerm" type="number" min="1" placeholder="12" :class="[input, 'border-neutral-200 dark:border-neutral-700']" />
              </div>
            </div>

            <div class="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/60">
              <p class="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Method Summary</p>
              <p class="mt-2 text-sm text-neutral-900 dark:text-white">
                {{ form.interest_method === 'reducing_balance' ? 'Reducing balance' : form.interest_method === 'flat' ? 'Flat rate' : 'Select an interest method' }}
              </p>
              <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                <span v-if="form.interest_method === 'reducing_balance' && form.repayment_structure === 'equal_installment'">Installments stay level while principal share rises over time.</span>
                <span v-else-if="form.interest_method === 'reducing_balance' && form.repayment_structure === 'equal_principal'">Principal stays fixed and total installments decline over time.</span>
                <span v-else-if="form.interest_method === 'flat'">Interest is spread on original principal for the full term.</span>
                <span v-else>Preview will update once the core pricing fields are filled in.</span>
              </p>
            </div>

            <div v-if="previewLoading" class="py-10 text-center text-sm text-neutral-400">Calculating preview…</div>

            <template v-else-if="preview">
              <div class="grid gap-3">
                <div class="rounded-2xl border border-neutral-100 p-4 dark:border-neutral-800">
                  <p class="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Estimated Installment</p>
                  <p class="mt-1 text-xl font-semibold text-neutral-900 dark:text-white">{{ money(preview.installment_amount) }}</p>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-2xl border border-neutral-100 p-4 dark:border-neutral-800">
                    <p class="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Total Interest</p>
                    <p class="mt-1 text-base font-semibold text-neutral-900 dark:text-white">{{ money(preview.total_interest) }}</p>
                  </div>
                  <div class="rounded-2xl border border-neutral-100 p-4 dark:border-neutral-800">
                    <p class="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Total Repayment</p>
                    <p class="mt-1 text-base font-semibold text-neutral-900 dark:text-white">{{ money(preview.total_repayment) }}</p>
                  </div>
                </div>
              </div>

              <!-- Total cost of credit -->
              <div v-if="estimatedFees.breakdown.length" class="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                <p class="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">Total Cost of Credit</p>
                <div class="mt-3 space-y-2">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-neutral-600 dark:text-neutral-400">Principal</span>
                    <span class="font-medium text-neutral-900 dark:text-white">{{ money(Number(previewAmount || form.min_amount || 0)) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-neutral-600 dark:text-neutral-400">Total Interest</span>
                    <span class="font-medium text-neutral-900 dark:text-white">{{ money(preview.total_interest) }}</span>
                  </div>
                  <div v-for="fee in estimatedFees.breakdown" :key="fee.name" class="flex items-center justify-between text-sm">
                    <span class="text-neutral-600 dark:text-neutral-400">{{ fee.name }}</span>
                    <span class="font-medium text-neutral-900 dark:text-white">{{ money(fee.amount) }}</span>
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
                <p class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Schedule Snapshot</p>
                <div class="max-h-80 overflow-y-auto rounded-2xl border border-neutral-100 dark:border-neutral-800">
                  <table class="w-full text-xs">
                    <thead class="sticky top-0 bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
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
                        <td class="px-3 py-2 text-right font-medium text-neutral-900 dark:text-white">{{ money(row.installment) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div v-if="preview.messages?.length" class="space-y-2">
                <p v-for="note in preview.messages" :key="note" class="text-xs text-neutral-500 dark:text-neutral-400">{{ note }}</p>
              </div>
            </template>

            <div v-else class="rounded-2xl border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
              Fill in interest method, rate, term, and preview amount to generate a repayment sample.
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>
