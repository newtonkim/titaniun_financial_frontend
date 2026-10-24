<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowLeft, CreditCard, Pencil, ToggleLeft, ToggleRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { formatMoney } from '@/core/utils/format'
import LoanProductFormDrawer from '../../components/LoanProductFormDrawer.vue'
import { ACCOUNT_FIELDS } from '../../composables/useLoanProductForm'
import { interestMethodLabel, interestPeriodLabel } from '../../composables/useLoanProducts'
import { useLoanProductShow } from '../../composables/useLoanProductShow'
import type { AccountSummary, LoanProduct } from '../../types'

const router = useRouter()
const { product, loading, fetch, orDash } = useLoanProductShow()

onMounted(fetch)

const editOpen = ref(false)

const card = 'rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900'
const term = 'mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400'
const detail = 'text-sm text-neutral-900 dark:text-white'

const titleCase = (value: string | null | undefined) => (value ? value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '—')

function charge(type: string, value: string): string {
  if (type === 'none') return 'None'
  if (type === 'flat') return formatMoney(value)
  return `${value}%${type === 'percentage_per_day' ? ' per day' : ''}`
}

function account(p: LoanProduct, field: string): AccountSummary | null | undefined {
  return p[field.replace(/_id$/, '') as keyof LoanProduct] as AccountSummary | null | undefined
}
</script>

<template>
  <div class="tw-scope flex h-full flex-1 flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
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
          <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{{ loading ? 'Loading…' : product?.name }}</h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ product?.code ? `${product.code} · ` : '' }}Loan product details</p>
        </div>
      </div>
      <button
        v-if="product"
        type="button"
        class="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-navy hover:text-white dark:border-neutral-700 dark:text-neutral-300"
        @click="editOpen = true"
      >
        <Pencil class="h-4 w-4" />
        Edit
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20 text-sm text-neutral-400">Loading Data…</div>

    <template v-else-if="product">
      <!-- General -->
      <div :class="card">
        <h2 class="mb-5 text-base font-semibold text-neutral-900 dark:text-white">General Information</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex items-center gap-3 sm:col-span-2">
            <span
              class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="product.is_active ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'"
            >
              <component :is="product.is_active ? ToggleRight : ToggleLeft" class="h-3 w-3" />
              {{ product.is_active ? 'Active' : 'Inactive' }}
            </span>
            <span v-if="product.is_in_use" class="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              In use by {{ product.loan_count ?? 0 }} loans
            </span>
          </div>
          <div class="sm:col-span-2">
            <p :class="term">Description</p>
            <p :class="detail">{{ orDash(product.description) }}</p>
          </div>
          <div>
            <p :class="term">Minimum Amount</p>
            <p :class="detail">{{ formatMoney(product.min_amount) }}</p>
          </div>
          <div>
            <p :class="term">Maximum Amount</p>
            <p :class="detail">{{ product.max_amount === null ? 'No upper limit' : formatMoney(product.max_amount) }}</p>
          </div>
        </div>
      </div>

      <!-- Interest -->
      <div :class="card">
        <h2 class="mb-5 text-base font-semibold text-neutral-900 dark:text-white">Interest Settings</h2>
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <p :class="term">Interest Method</p>
            <p :class="detail">{{ interestMethodLabel(product.interest_method) }}</p>
          </div>
          <div>
            <p :class="term">Repayment Structure</p>
            <p :class="detail">{{ titleCase(product.repayment_structure) }}</p>
          </div>
          <div>
            <p :class="term">Interest Rate</p>
            <p :class="detail">{{ product.interest_rate }}% {{ interestPeriodLabel(product.interest_period) }}</p>
          </div>
        </div>
      </div>

      <div :class="card">
        <h2 class="mb-3 text-base font-semibold text-neutral-900 dark:text-white">Interest distribution</h2>
        <p :class="detail">{{ 100 - Number(product.commission_rate) }}% company · {{ product.commission_rate }}% commission</p>
        <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">The selected officer or referring guarantor earns commission on collected interest. Payout is held until the client fully clears the loan, then included in a quarter-end distribution. The borrower’s rate and principal are unaffected.</p>
      </div>

      <!-- Term & repayment -->
      <div :class="card">
        <h2 class="mb-5 text-base font-semibold text-neutral-900 dark:text-white">Loan Term &amp; Repayment</h2>
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <p :class="term">Loan Duration</p>
            <p :class="detail">{{ product.min_term === product.max_term ? product.max_term : `${product.min_term}–${product.max_term}` }} {{ product.duration_type }}</p>
          </div>
          <div>
            <p :class="term">Repayment Cycle</p>
            <p :class="detail">{{ titleCase(product.repayment_frequency) }}</p>
          </div>
          <div>
            <p :class="term">Grace Period</p>
            <p :class="detail">{{ product.grace_period }} days</p>
          </div>
          <div>
            <p :class="term">Warning Days</p>
            <p :class="detail">{{ product.warning_days != null ? `${product.warning_days} days` : '—' }}</p>
          </div>
        </div>
      </div>

      <!-- Fees and penalties -->
      <div :class="card">
        <h2 class="mb-5 text-base font-semibold text-neutral-900 dark:text-white">Fees &amp; Penalties</h2>
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <p :class="term">Processing Fee</p>
            <p :class="detail">{{ charge(product.processing_fee_type, String(product.processing_fee_value)) }}</p>
          </div>
          <div>
            <p :class="term">Penalty</p>
            <p :class="detail">{{ charge(product.penalty_type, String(product.penalty_rate)) }}</p>
          </div>
          <div>
            <p :class="term">Penalty Grace Period</p>
            <p :class="detail">{{ product.penalty_grace_days }} days</p>
          </div>
        </div>
      </div>

      <!-- Accounting mapping -->
      <div :class="card">
        <h2 class="mb-5 text-base font-semibold text-neutral-900 dark:text-white">Accounting Mapping</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div v-for="meta in ACCOUNT_FIELDS" :key="meta.field">
            <p :class="term">{{ meta.label }}</p>
            <p :class="detail">
              <template v-if="account(product, meta.field)">
                <span class="mr-1 font-mono text-xs text-neutral-400">{{ account(product, meta.field)?.code }}</span>{{ account(product, meta.field)?.name }}
              </template>
              <template v-else>—</template>
            </p>
          </div>
        </div>
      </div>
    </template>

    <LoanProductFormDrawer v-if="product" v-model:open="editOpen" :product-id="product.id" @saved="fetch" />
  </div>
</template>
