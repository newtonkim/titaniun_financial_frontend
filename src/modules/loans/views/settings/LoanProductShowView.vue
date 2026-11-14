<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowLeft, CreditCard, Pencil, ToggleLeft, ToggleRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { formatMoney, formatPercent } from '@/core/utils/format'
import LoanProductFormDrawer from '../../components/LoanProductFormDrawer.vue'
import { ACCOUNT_FIELDS } from '../../composables/useLoanProductForm'
import { interestMethodLabel, interestPeriodLabel } from '../../composables/useLoanProducts'
import { useLoanProductShow } from '../../composables/useLoanProductShow'
import type { AccountSummary, LoanProduct } from '../../types'

const router = useRouter()
const { product, loading, fetch, orDash } = useLoanProductShow()

onMounted(fetch)

const editOpen = ref(false)

const card = 'rounded-lg border border-border bg-background p-6'
const term = 'mb-1 text-xs font-medium text-muted-foreground'
const detail = 'text-sm text-foreground'

const titleCase = (value: string | null | undefined) => (value ? value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '—')

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
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
          <CreditCard class="h-5 w-5 text-brand" />
        </div>
        <div>
          <h1 class="text-page-title text-heading">{{ loading ? 'Loading…' : product?.name }}</h1>
          <p class="text-sm text-muted-foreground">{{ product?.code ? `${product.code} · ` : '' }}Loan product details</p>
        </div>
      </div>
      <button
        v-if="product"
        type="button"
        class="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-accent dark:text-neutral-300"
        @click="editOpen = true"
      >
        <Pencil class="h-4 w-4" />
        Edit
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20 text-sm text-muted-foreground">Loading Data…</div>

    <template v-else-if="product">
      <!-- General -->
      <div :class="card">
        <h2 class="mb-5 text-section text-heading">General Information</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex items-center gap-3 sm:col-span-2">
            <span
              class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="product.is_active ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-neutral-100 text-muted-foreground dark:bg-neutral-800'"
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
        <h2 class="mb-5 text-section text-heading">Interest Settings</h2>
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
        <h2 class="mb-3 text-section text-heading">Interest distribution</h2>
        <p :class="detail">{{ formatPercent(product.company_interest_rate) }}% company · {{ formatPercent(product.commission_interest_rate) }}% commission, of {{ formatPercent(product.interest_rate) }}% interest {{ product.interest_period === 'per_year' ? 'per year' : 'per month' }}</p>
        <p class="mt-2 text-sm text-muted-foreground">The selected officer or referring guarantor earns commission on collected interest. Payout is held until the client fully clears the loan, then included in a quarter-end distribution. The borrower’s rate and principal are unaffected.</p>
      </div>

      <!-- Term & repayment -->
      <div :class="card">
        <h2 class="mb-5 text-section text-heading">Loan Term &amp; Repayment</h2>
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

      <!-- Charges and penalties -->
      <div :class="card">
        <h2 class="mb-1 text-section text-heading">Charges &amp; Penalties</h2>
        <p class="mb-5 text-sm text-muted-foreground">Add, edit or delete them with Edit product.</p>
        <div class="grid gap-6 sm:grid-cols-2">
          <div>
            <p :class="term">Charges added to new applications</p>
            <p v-if="!product.charges?.length" :class="detail">None</p>
            <ul v-else class="mt-1 space-y-1.5 text-sm">
              <li v-for="item in product.charges" :key="item.id">
                <span class="font-medium text-foreground">{{ item.name }}</span>:
                {{ item.calculation === 'percentage' ? `${formatPercent(item.value)}% of principal` : formatMoney(item.value) }},
                {{ item.frequency === 'monthly' ? 'monthly' : 'once' }}, {{ item.collection === 'upfront' ? 'deducted at disbursement' : 'with repayments' }}
                <span v-if="!item.is_active" class="text-muted-foreground">(inactive)</span>
              </li>
            </ul>
          </div>
          <div>
            <p :class="term">Penalties on overdue installments</p>
            <p v-if="!product.penalties?.length" :class="detail">None</p>
            <ul v-else class="mt-1 space-y-1.5 text-sm">
              <li v-for="item in product.penalties" :key="item.id">
                <span class="font-medium text-foreground">{{ item.name }}</span>:
                {{ item.calculation === 'flat' ? formatMoney(item.value) : `${formatPercent(item.value)}% of overdue${item.calculation === 'percentage_per_day' ? ' per day' : ''}` }},
                after {{ item.grace_days }} grace days
                <span v-if="!item.is_active" class="text-muted-foreground">(inactive)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Accounting mapping -->
      <div :class="card">
        <h2 class="mb-5 text-section text-heading">Accounting Mapping</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div v-for="meta in ACCOUNT_FIELDS" :key="meta.field">
            <p :class="term">{{ meta.label }}</p>
            <p :class="detail">
              <template v-if="account(product, meta.field)">
                <span class="mr-1 font-mono text-xs text-muted-foreground">{{ account(product, meta.field)?.code }}</span>{{ account(product, meta.field)?.name }}
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
