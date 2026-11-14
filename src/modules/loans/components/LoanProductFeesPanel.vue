<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { ApiError, type ValidationErrors } from '@/core/api/http'
import { formatMoney, formatPercent } from '@/core/utils/format'
import { chartOfAccountsApi } from '@/modules/accounting/api'
import type { ChartOfAccount } from '@/modules/accounting/types'
import { loanProductChargesApi, loanProductPenaltiesApi } from '../api'
import type { LoanProductCharge, LoanProductChargeInput, LoanProductPenalty, LoanProductPenaltyInput } from '../types'

/**
 * The charges a product adds to each new application and the penalties it charges on overdue
 * installments, each added, edited and deleted here. A product must be saved before it has any.
 */
const props = defineProps<{ productId: number | null }>()

const charges = ref<LoanProductCharge[]>([])
const penalties = ref<LoanProductPenalty[]>([])
const incomeAccounts = ref<ChartOfAccount[]>([])
const loading = ref(false)
const message = ref('')

type Editing<T> = { id: number | null; data: T; errors: ValidationErrors; saving: boolean } | null
const chargeEdit = ref<Editing<LoanProductChargeInput>>(null)
const penaltyEdit = ref<Editing<LoanProductPenaltyInput>>(null)
const confirmDelete = ref<{ kind: 'charge' | 'penalty'; id: number } | null>(null)

const feeAccountId = computed(() => incomeAccounts.value.find((account) => account.code === '42200')?.id ?? incomeAccounts.value[0]?.id ?? 0)
const penaltyAccountId = computed(() => incomeAccounts.value.find((account) => account.code === '42400')?.id ?? feeAccountId.value)

async function load() {
  if (props.productId === null) return
  loading.value = true
  message.value = ''
  try {
    const [chargeList, penaltyList, accounts] = await Promise.all([
      loanProductChargesApi.list(props.productId),
      loanProductPenaltiesApi.list(props.productId),
      chartOfAccountsApi.list({ is_active: true }),
    ])
    charges.value = chargeList
    penalties.value = penaltyList
    incomeAccounts.value = accounts.data.filter((account) => account.type === 'income' && account.is_postable)
  } catch {
    message.value = 'Charges and penalties could not be loaded.'
  } finally {
    loading.value = false
  }
}

watch(() => props.productId, () => void load(), { immediate: true })

function editCharge(charge: LoanProductCharge | null) {
  penaltyEdit.value = null
  chargeEdit.value = {
    id: charge?.id ?? null,
    errors: {},
    saving: false,
    data: charge
      ? { name: charge.name, calculation: charge.calculation, value: Number(charge.value), frequency: charge.frequency, collection: charge.collection, chart_of_account_id: charge.chart_of_account_id, is_active: charge.is_active }
      : { name: '', calculation: 'flat', value: 0, frequency: 'once', collection: 'upfront', chart_of_account_id: feeAccountId.value, is_active: true },
  }
}

function editPenalty(penalty: LoanProductPenalty | null) {
  chargeEdit.value = null
  penaltyEdit.value = {
    id: penalty?.id ?? null,
    errors: {},
    saving: false,
    data: penalty
      ? { name: penalty.name, calculation: penalty.calculation, value: Number(penalty.value), grace_days: penalty.grace_days, chart_of_account_id: penalty.chart_of_account_id, is_active: penalty.is_active }
      : { name: 'Late payment penalty', calculation: 'percentage_per_day', value: 0, grace_days: 0, chart_of_account_id: penaltyAccountId.value, is_active: true },
  }
}

// A monthly charge can only be collected with repayments.
watch(() => chargeEdit.value?.data.frequency, (frequency) => {
  if (chargeEdit.value && frequency === 'monthly') chargeEdit.value.data.collection = 'repayment'
})

async function saveCharge() {
  const edit = chargeEdit.value
  if (!edit || props.productId === null) return
  edit.saving = true
  edit.errors = {}
  try {
    const saved = edit.id === null ? await loanProductChargesApi.create(props.productId, edit.data) : await loanProductChargesApi.update(props.productId, edit.id, edit.data)
    charges.value = edit.id === null ? [...charges.value, saved] : charges.value.map((charge) => (charge.id === saved.id ? saved : charge))
    chargeEdit.value = null
  } catch (error) {
    if (error instanceof ApiError && error.isValidation) edit.errors = error.errors
    else message.value = error instanceof ApiError ? error.message : 'The charge could not be saved.'
  } finally {
    edit.saving = false
  }
}

async function savePenalty() {
  const edit = penaltyEdit.value
  if (!edit || props.productId === null) return
  edit.saving = true
  edit.errors = {}
  try {
    const saved = edit.id === null ? await loanProductPenaltiesApi.create(props.productId, edit.data) : await loanProductPenaltiesApi.update(props.productId, edit.id, edit.data)
    penalties.value = edit.id === null ? [...penalties.value, saved] : penalties.value.map((penalty) => (penalty.id === saved.id ? saved : penalty))
    penaltyEdit.value = null
  } catch (error) {
    if (error instanceof ApiError && error.isValidation) edit.errors = error.errors
    else message.value = error instanceof ApiError ? error.message : 'The penalty could not be saved.'
  } finally {
    edit.saving = false
  }
}

async function remove() {
  const target = confirmDelete.value
  if (!target || props.productId === null) return
  try {
    if (target.kind === 'charge') {
      await loanProductChargesApi.remove(props.productId, target.id)
      charges.value = charges.value.filter((charge) => charge.id !== target.id)
    } else {
      await loanProductPenaltiesApi.remove(props.productId, target.id)
      penalties.value = penalties.value.filter((penalty) => penalty.id !== target.id)
    }
  } catch (error) {
    message.value = error instanceof ApiError ? error.message : 'It could not be deleted.'
  } finally {
    confirmDelete.value = null
  }
}

const chargeAmount = (charge: LoanProductCharge) => (charge.calculation === 'percentage' ? `${formatPercent(charge.value)}% of principal` : formatMoney(charge.value))
const penaltyAmount = (penalty: LoanProductPenalty) =>
  penalty.calculation === 'flat'
    ? formatMoney(penalty.value)
    : `${formatPercent(penalty.value)}% of overdue${penalty.calculation === 'percentage_per_day' ? ' per day' : ''}`
const accountLabel = (account?: { code: string; name: string }) => (account ? `${account.code} · ${account.name}` : '—')
const fieldError = (errors: ValidationErrors, field: string) => errors[field]?.[0]

const label = 'mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300'
const input = 'w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground'
const iconButton = 'rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800'
const addButton = 'flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800'
const primaryButton = 'rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60'
const secondaryButton = 'rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800'
</script>

<template>
  <div class="flex flex-col gap-6">
    <p v-if="productId === null" class="rounded-lg border border-border bg-neutral-50/70 p-3.5 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
      Create the product first; then reopen it to add its charges and penalties here.
    </p>
    <template v-else>
      <p v-if="message" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">{{ message }}</p>
      <p v-if="loading" class="text-xs text-muted-foreground">Loading charges and penalties…</p>

      <!-- Charges -->
      <section>
        <div class="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-semibold text-heading">Charges</h3>
            <p class="text-xs text-muted-foreground">Added to each new loan application on this product; staff can still change them on the loan.</p>
          </div>
          <button type="button" :class="addButton" @click="editCharge(null)"><Plus class="h-3.5 w-3.5" />Add charge</button>
        </div>
        <div class="overflow-hidden rounded-lg border border-border">
          <table class="w-full text-left text-xs">
            <thead class="bg-neutral-50 text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
              <tr><th class="px-3 py-2 font-medium">Charge</th><th class="px-3 py-2 font-medium">Amount</th><th class="px-3 py-2 font-medium">When</th><th class="px-3 py-2 font-medium">Account</th><th class="px-3 py-2" /></tr>
            </thead>
            <tbody>
              <tr v-if="!charges.length"><td colspan="5" class="px-3 py-3 text-muted-foreground">No charges yet.</td></tr>
              <tr v-for="charge in charges" :key="charge.id" class="border-t border-border">
                <td class="px-3 py-2 font-medium text-foreground">{{ charge.name }}<span v-if="!charge.is_active" class="ml-1 text-muted-foreground">(inactive)</span></td>
                <td class="px-3 py-2">{{ chargeAmount(charge) }}</td>
                <td class="px-3 py-2">{{ charge.frequency === 'monthly' ? 'Monthly' : 'Once' }}, {{ charge.collection === 'upfront' ? 'deducted at disbursement' : 'with repayments' }}</td>
                <td class="px-3 py-2">{{ accountLabel(charge.account) }}</td>
                <td class="whitespace-nowrap px-3 py-2 text-right">
                  <template v-if="confirmDelete?.kind === 'charge' && confirmDelete.id === charge.id">
                    <span class="mr-2">Delete?</span><button type="button" class="mr-1 text-red-600" @click="remove">Yes</button><button type="button" @click="confirmDelete = null">No</button>
                  </template>
                  <template v-else>
                    <button type="button" :class="iconButton" :aria-label="`Edit ${charge.name}`" @click="editCharge(charge)"><Pencil class="h-3.5 w-3.5" /></button>
                    <button type="button" :class="[iconButton, 'hover:text-red-600']" :aria-label="`Delete ${charge.name}`" @click="confirmDelete = { kind: 'charge', id: charge.id }"><Trash2 class="h-3.5 w-3.5" /></button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="chargeEdit" class="mt-3 rounded-lg border border-border bg-neutral-50/70 p-4 dark:bg-neutral-800/40">
          <h4 class="mb-3 text-xs font-semibold text-heading">{{ chargeEdit.id === null ? 'New charge' : 'Edit charge' }}</h4>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="sm:col-span-2"><label :class="label" for="lpc-name">Name</label><input id="lpc-name" v-model="chargeEdit.data.name" :class="input" placeholder="e.g. Processing fee" /><p v-if="fieldError(chargeEdit.errors, 'name')" class="mt-1 text-xs text-red-500">{{ fieldError(chargeEdit.errors, 'name') }}</p></div>
            <div><label :class="label" for="lpc-calc">Calculation</label><select id="lpc-calc" v-model="chargeEdit.data.calculation" :class="input"><option value="flat">Flat amount</option><option value="percentage">Percentage of principal</option></select></div>
            <div><label :class="label" for="lpc-value">{{ chargeEdit.data.calculation === 'percentage' ? 'Rate (%)' : 'Amount' }}</label><input id="lpc-value" v-model.number="chargeEdit.data.value" type="number" min="0" step="0.01" :class="input" /><p v-if="fieldError(chargeEdit.errors, 'value')" class="mt-1 text-xs text-red-500">{{ fieldError(chargeEdit.errors, 'value') }}</p></div>
            <div><label :class="label" for="lpc-frequency">Frequency</label><select id="lpc-frequency" v-model="chargeEdit.data.frequency" :class="input"><option value="once">One time</option><option value="monthly">Monthly</option></select></div>
            <div><label :class="label" for="lpc-collection">Collection</label><select id="lpc-collection" v-model="chargeEdit.data.collection" :class="input"><option value="upfront" :disabled="chargeEdit.data.frequency === 'monthly'">Deduct at disbursement</option><option value="repayment">With repayments</option></select><p v-if="fieldError(chargeEdit.errors, 'collection')" class="mt-1 text-xs text-red-500">{{ fieldError(chargeEdit.errors, 'collection') }}</p></div>
            <div class="sm:col-span-2"><label :class="label" for="lpc-account">Income account</label><select id="lpc-account" v-model.number="chargeEdit.data.chart_of_account_id" :class="input"><option v-for="account in incomeAccounts" :key="account.id" :value="account.id">{{ account.code }} · {{ account.name }}</option></select><p v-if="fieldError(chargeEdit.errors, 'chart_of_account_id')" class="mt-1 text-xs text-red-500">{{ fieldError(chargeEdit.errors, 'chart_of_account_id') }}</p></div>
            <label class="flex items-center gap-2 text-xs sm:col-span-2"><input v-model="chargeEdit.data.is_active" type="checkbox" />Active: add it to new applications</label>
          </div>
          <div class="mt-3 flex justify-end gap-2"><button type="button" :class="secondaryButton" @click="chargeEdit = null">Cancel</button><button type="button" :class="primaryButton" :disabled="chargeEdit.saving" @click="saveCharge">{{ chargeEdit.saving ? 'Saving…' : 'Save charge' }}</button></div>
        </div>
      </section>

      <!-- Penalties -->
      <section>
        <div class="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-semibold text-heading">Penalties</h3>
            <p class="text-xs text-muted-foreground">Charged every night on installments still unpaid after their due date and grace days; collected before interest.</p>
          </div>
          <button type="button" :class="addButton" @click="editPenalty(null)"><Plus class="h-3.5 w-3.5" />Add penalty</button>
        </div>
        <div class="overflow-hidden rounded-lg border border-border">
          <table class="w-full text-left text-xs">
            <thead class="bg-neutral-50 text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
              <tr><th class="px-3 py-2 font-medium">Penalty</th><th class="px-3 py-2 font-medium">Amount</th><th class="px-3 py-2 font-medium">Grace</th><th class="px-3 py-2 font-medium">Account</th><th class="px-3 py-2" /></tr>
            </thead>
            <tbody>
              <tr v-if="!penalties.length"><td colspan="5" class="px-3 py-3 text-muted-foreground">No penalties yet.</td></tr>
              <tr v-for="penalty in penalties" :key="penalty.id" class="border-t border-border">
                <td class="px-3 py-2 font-medium text-foreground">{{ penalty.name }}<span v-if="!penalty.is_active" class="ml-1 text-muted-foreground">(inactive)</span></td>
                <td class="px-3 py-2">{{ penaltyAmount(penalty) }}</td>
                <td class="px-3 py-2">{{ penalty.grace_days }} days</td>
                <td class="px-3 py-2">{{ accountLabel(penalty.account) }}</td>
                <td class="whitespace-nowrap px-3 py-2 text-right">
                  <template v-if="confirmDelete?.kind === 'penalty' && confirmDelete.id === penalty.id">
                    <span class="mr-2">Delete?</span><button type="button" class="mr-1 text-red-600" @click="remove">Yes</button><button type="button" @click="confirmDelete = null">No</button>
                  </template>
                  <template v-else>
                    <button type="button" :class="iconButton" :aria-label="`Edit ${penalty.name}`" @click="editPenalty(penalty)"><Pencil class="h-3.5 w-3.5" /></button>
                    <button type="button" :class="[iconButton, 'hover:text-red-600']" :aria-label="`Delete ${penalty.name}`" @click="confirmDelete = { kind: 'penalty', id: penalty.id }"><Trash2 class="h-3.5 w-3.5" /></button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="penaltyEdit" class="mt-3 rounded-lg border border-border bg-neutral-50/70 p-4 dark:bg-neutral-800/40">
          <h4 class="mb-3 text-xs font-semibold text-heading">{{ penaltyEdit.id === null ? 'New penalty' : 'Edit penalty' }}</h4>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="sm:col-span-2"><label :class="label" for="lpp-name">Name</label><input id="lpp-name" v-model="penaltyEdit.data.name" :class="input" /><p v-if="fieldError(penaltyEdit.errors, 'name')" class="mt-1 text-xs text-red-500">{{ fieldError(penaltyEdit.errors, 'name') }}</p></div>
            <div><label :class="label" for="lpp-calc">Calculation</label><select id="lpp-calc" v-model="penaltyEdit.data.calculation" :class="input"><option value="flat">Flat amount, once</option><option value="percentage">% of overdue amount, once</option><option value="percentage_per_day">% of overdue amount per day</option></select></div>
            <div><label :class="label" for="lpp-value">{{ penaltyEdit.data.calculation === 'flat' ? 'Amount' : 'Rate (%)' }}</label><input id="lpp-value" v-model.number="penaltyEdit.data.value" type="number" min="0" step="0.0001" :class="input" /><p v-if="fieldError(penaltyEdit.errors, 'value')" class="mt-1 text-xs text-red-500">{{ fieldError(penaltyEdit.errors, 'value') }}</p></div>
            <div><label :class="label" for="lpp-grace">Grace period (days)</label><input id="lpp-grace" v-model.number="penaltyEdit.data.grace_days" type="number" min="0" max="365" :class="input" /><p v-if="fieldError(penaltyEdit.errors, 'grace_days')" class="mt-1 text-xs text-red-500">{{ fieldError(penaltyEdit.errors, 'grace_days') }}</p></div>
            <div><label :class="label" for="lpp-account">Income account</label><select id="lpp-account" v-model.number="penaltyEdit.data.chart_of_account_id" :class="input"><option v-for="account in incomeAccounts" :key="account.id" :value="account.id">{{ account.code }} · {{ account.name }}</option></select><p v-if="fieldError(penaltyEdit.errors, 'chart_of_account_id')" class="mt-1 text-xs text-red-500">{{ fieldError(penaltyEdit.errors, 'chart_of_account_id') }}</p></div>
            <label class="flex items-center gap-2 text-xs sm:col-span-2"><input v-model="penaltyEdit.data.is_active" type="checkbox" />Active: charge it on overdue installments</label>
          </div>
          <div class="mt-3 flex justify-end gap-2"><button type="button" :class="secondaryButton" @click="penaltyEdit = null">Cancel</button><button type="button" :class="primaryButton" :disabled="penaltyEdit.saving" @click="savePenalty">{{ penaltyEdit.saving ? 'Saving…' : 'Save penalty' }}</button></div>
        </div>
      </section>
    </template>
  </div>
</template>
