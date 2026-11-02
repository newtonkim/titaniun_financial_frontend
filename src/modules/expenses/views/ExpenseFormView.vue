<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Trash2 } from 'lucide-vue-next'
import PageHeader from '@/core/components/PageHeader.vue'
import SearchableSelect from '@/core/components/SearchableSelect.vue'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { useForm } from '@/core/composables/useForm'
import { formatMoney, today } from '@/core/utils/format'
import { expenseCategoriesApi, expensesApi, suppliersApi } from '../api'
import type { ExpenseCategory, ExpenseLinePayload } from '../types'

/** Raise a voucher, or change a draft. Saving only keeps a draft; nothing reaches the accounts from here. */
const props = defineProps<{ id?: string }>()
const router = useRouter()

const categories = ref<ExpenseCategory[]>([])
const suppliers = ref<{ id: number; name: string }[]>([])
const paymentAccounts = ref<{ id: number; name: string }[]>([])
const alreadyPaid = ref(false)
const loadError = ref('')

const blankLine = (): ExpenseLinePayload => ({ expense_category_id: null, description: '', amount: '', vat_amount: '', cost_centre: '' })

const form = useForm(
  {
    expense_date: today(),
    description: '',
    reference: '',
    supplier_id: null as number | null,
    payee_name: '',
    supplier_invoice_no: '',
    wht_amount: '',
    no_receipt_reason: '',
    resolution_reference: '',
    paid_on: today(),
    paid_from_account_id: null as number | null,
    lines: [blankLine()],
  },
  async (data) => {
    const payload = {
      ...data,
      reference: data.reference || null,
      payee_name: data.supplier_id ? null : data.payee_name || null,
      supplier_invoice_no: data.supplier_invoice_no || null,
      wht_amount: data.wht_amount || null,
      no_receipt_reason: data.no_receipt_reason || null,
      resolution_reference: data.resolution_reference || null,
      paid_on: alreadyPaid.value ? data.paid_on : null,
      paid_from_account_id: alreadyPaid.value ? data.paid_from_account_id : null,
      lines: data.lines.map((line) => ({ ...line, vat_amount: line.vat_amount || '0', description: line.description || '', cost_centre: line.cost_centre || '' })),
    }
    const expense = props.id ? await expensesApi.update(Number(props.id), payload) : await expensesApi.create(payload)
    await router.push({ name: 'expenses.show', params: { id: expense.id } })
  },
)

const usable = computed(() => categories.value.filter((category) => category.is_active && category.kind !== 'payroll_only'))
const total = computed(() => form.data.lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0))
const needsResolution = computed(() => form.data.lines.some((line) => categories.value.find((category) => category.id === line.expense_category_id)?.requires_resolution))
const netPaid = computed(() => total.value - (Number(form.data.wht_amount) || 0))

onMounted(async () => {
  try {
    const [loadedCategories, loadedSuppliers, accounts] = await Promise.all([
      expenseCategoriesApi.list({ per_page: 100, active_only: 1 }),
      suppliersApi.list({ per_page: 100, active_only: true }),
      expensesApi.paymentAccounts(),
    ])
    categories.value = loadedCategories.data
    suppliers.value = loadedSuppliers.data.map((supplier) => ({ id: supplier.id, name: supplier.name }))
    paymentAccounts.value = accounts

    if (props.id) {
      const expense = await expensesApi.show(Number(props.id))
      Object.assign(form.data, {
        expense_date: expense.expense_date,
        description: expense.description,
        reference: expense.reference ?? '',
        supplier_id: expense.supplier_id,
        payee_name: expense.payee_name ?? '',
        supplier_invoice_no: expense.supplier_invoice_no ?? '',
        wht_amount: Number(expense.wht_amount) ? expense.wht_amount : '',
        no_receipt_reason: expense.no_receipt_reason ?? '',
        resolution_reference: expense.resolution_reference ?? '',
        paid_on: expense.paid_on ?? today(),
        paid_from_account_id: expense.paid_from_account_id,
        lines: (expense.lines ?? []).map((line) => ({ expense_category_id: line.expense_category_id, description: line.description ?? '', amount: line.amount, vat_amount: Number(line.vat_amount) ? line.vat_amount : '', cost_centre: line.cost_centre ?? '' })),
      })
      alreadyPaid.value = expense.paid_on !== null
    }
  } catch {
    loadError.value = 'The voucher form could not be loaded. Refresh to try again.'
  }
})

const field = 'flex flex-col gap-1 text-sm font-medium'
const hint = 'text-xs font-normal text-muted-foreground'
const fieldError = 'text-xs font-normal text-destructive'
</script>

<template>
  <div class="tw-scope flex flex-col gap-6">
    <PageHeader :title="id ? 'Edit voucher' : 'New expense voucher'" description="Saved as a draft. Someone else approves it before it reaches the accounts." />

    <form class="flex flex-col gap-6" @submit.prevent="form.submit">
      <p v-if="loadError || form.message.value" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ loadError || form.message.value }}</p>

      <section class="rounded-lg border border-border bg-background p-5">
        <h2 class="mb-4 text-section text-heading">What was it for?</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <label :class="[field, 'sm:col-span-2']">
            Description
            <Input v-model="form.data.description" required maxlength="255" placeholder="November office rent" />
            <span v-if="form.error('description')" :class="fieldError">{{ form.error('description') }}</span>
          </label>
          <label :class="field">
            Invoice or receipt date
            <Input v-model="form.data.expense_date" type="date" :max="today()" required />
            <span v-if="form.error('expense_date')" :class="fieldError">{{ form.error('expense_date') }}</span>
          </label>
          <label :class="field">
            Reference
            <Input v-model="form.data.reference" maxlength="100" />
          </label>
        </div>
      </section>

      <section class="rounded-lg border border-border bg-background p-5">
        <h2 class="mb-4 text-section text-heading">Who was paid?</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div :class="field">
            <span>Supplier</span>
            <SearchableSelect v-model="form.data.supplier_id" :options="suppliers" placeholder="Choose a supplier" :error="form.error('supplier_id')" />
          </div>
          <label :class="field">
            Or one-off payee
            <Input v-model="form.data.payee_name" :disabled="form.data.supplier_id !== null" maxlength="255" placeholder="Name on the receipt" />
            <span v-if="form.error('payee_name')" :class="fieldError">{{ form.error('payee_name') }}</span>
          </label>
          <label :class="field">
            Supplier's invoice number
            <Input v-model="form.data.supplier_invoice_no" maxlength="100" />
          </label>
        </div>
      </section>

      <section class="rounded-lg border border-border bg-background p-5">
        <h2 class="mb-1 text-section text-heading">Amounts</h2>
        <p class="mb-4 text-sm text-muted-foreground">One line per category. Enter what the SACCO bears, VAT included.</p>
        <p v-if="form.error('lines')" :class="[fieldError, 'mb-3']">{{ form.error('lines') }}</p>

        <div class="flex flex-col gap-4">
          <div v-for="(line, index) in form.data.lines" :key="index" class="grid gap-3 border-b border-border pb-4 last:border-b-0 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-start">
            <label :class="field">
              Category
              <select v-model="line.expense_category_id" required class="h-9 rounded-md border border-border bg-background px-2 text-sm font-normal">
                <option :value="null" disabled>Choose</option>
                <option v-for="category in usable" :key="category.id" :value="category.id">{{ category.name }}</option>
              </select>
              <span v-if="form.error(`lines.${index}.expense_category_id`)" :class="fieldError">{{ form.error(`lines.${index}.expense_category_id`) }}</span>
            </label>
            <label :class="field">
              Detail
              <Input v-model="line.description" maxlength="255" placeholder="Optional" />
            </label>
            <label :class="field">
              Amount (UGX)
              <Input v-model="line.amount" type="number" min="0.01" step="0.01" required class="tabular-nums" />
              <span v-if="form.error(`lines.${index}.amount`)" :class="fieldError">{{ form.error(`lines.${index}.amount`) }}</span>
            </label>
            <label :class="field">
              Of which VAT
              <Input v-model="line.vat_amount" type="number" min="0" step="0.01" class="tabular-nums" />
            </label>
            <button type="button" :disabled="form.data.lines.length === 1" :aria-label="`Remove line ${index + 1}`" class="mt-6 grid size-9 cursor-pointer place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40" @click="form.data.lines.splice(index, 1)">
              <Trash2 :size="15" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" @click="form.data.lines.push(blankLine())"><Plus /> Add line</Button>
          <p class="text-sm">Total <strong class="ml-2 tabular-nums text-heading">UGX {{ formatMoney(total) }}</strong></p>
        </div>

        <div class="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <label :class="field">
            Tax withheld (UGX)
            <Input v-model="form.data.wht_amount" type="number" min="0" step="0.01" class="tabular-nums" />
            <span :class="hint">Enter it if you withheld tax, such as 6% on a professional fee. It is owed to URA.</span>
          </label>
          <label v-if="needsResolution" :class="field">
            General meeting resolution
            <Input v-model="form.data.resolution_reference" required maxlength="100" placeholder="AGM/2026/07" />
            <span :class="hint">Payments to officers need a general meeting resolution.</span>
          </label>
        </div>
      </section>

      <section class="rounded-lg border border-border bg-background p-5">
        <h2 class="mb-4 text-section text-heading">Receipt and payment</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <label :class="[field, 'sm:col-span-2']">
            If there is no receipt, why not?
            <Input v-model="form.data.no_receipt_reason" maxlength="255" />
            <span :class="hint">You can attach receipts on the next screen. A voucher needs a receipt or a reason before it can be submitted.</span>
          </label>
          <label class="flex items-center gap-2 text-sm font-medium sm:col-span-2">
            <input v-model="alreadyPaid" type="checkbox" /> This has already been paid
          </label>
          <template v-if="alreadyPaid">
            <label :class="field">
              Paid on
              <Input v-model="form.data.paid_on" type="date" :max="today()" required />
              <span v-if="form.error('paid_on')" :class="fieldError">{{ form.error('paid_on') }}</span>
            </label>
            <div :class="field">
              <span>Paid from</span>
              <SearchableSelect v-model="form.data.paid_from_account_id" :options="paymentAccounts" placeholder="Choose an account" :error="form.error('paid_from_account_id')" />
            </div>
            <p v-if="Number(form.data.wht_amount)" :class="[hint, 'sm:col-span-2']">UGX {{ formatMoney(netPaid) }} leaves the account after tax withheld.</p>
          </template>
        </div>
      </section>

      <div class="flex justify-end gap-2">
        <Button as-child type="button" variant="outline"><RouterLink :to="id ? { name: 'expenses.show', params: { id } } : { name: 'expenses.index' }">Cancel</RouterLink></Button>
        <Button type="submit" :disabled="form.processing.value">{{ form.processing.value ? 'Saving…' : 'Save draft' }}</Button>
      </div>
    </form>
  </div>
</template>
