<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import { Input } from '@/core/components/ui/input'
import { useForm } from '@/core/composables/useForm'
import { today } from '@/core/utils/format'
import { expenseCategoriesApi, expensesApi } from '../api'
import type { Expense, ExpenseCategory } from '../types'

/** Add an expense, or change one that is not yet in the accounts. Picking a category and how it was paid is all the accounting there is. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ expense?: Expense | null }>()
const emit = defineEmits<{ saved: [expense: Expense] }>()

const NOT_PAID = 0

const categories = ref<ExpenseCategory[]>([])
const accounts = ref<{ id: number; name: string }[]>([])
const receipt = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const editing = computed(() => !!props.expense)
const form = useForm(
  { description: '', expense_category_id: null as number | null, amount: '', expense_date: today(), payee_name: '', paid_from: null as number | null, wht_amount: '', reference: '', resolution_reference: '' },
  async (data) => {
    const payload = {
      description: data.description,
      expense_date: data.expense_date,
      payee_name: data.payee_name || null,
      reference: data.reference || null,
      wht_amount: data.wht_amount || null,
      resolution_reference: data.resolution_reference || null,
      paid_from_account_id: data.paid_from === NOT_PAID ? null : data.paid_from,
      lines: [{ expense_category_id: data.expense_category_id ?? 0, amount: String(data.amount) }],
    }
    const saved = props.expense ? await expensesApi.update(props.expense.id, payload) : await expensesApi.create(payload)
    return receipt.value ? expensesApi.attach(saved.id, receipt.value) : saved
  },
)

const needsResolution = computed(() => categories.value.find((category) => category.id === form.data.expense_category_id)?.requires_resolution === true)

async function load() {
  const [loadedCategories, loadedAccounts] = await Promise.all([expenseCategoriesApi.list({ per_page: 100 }), expensesApi.paymentAccounts()])
  categories.value = loadedCategories.data.filter((category) => category.is_active)
  accounts.value = loadedAccounts
  if (form.data.paid_from === null) form.data.paid_from = loadedAccounts[0]?.id ?? NOT_PAID
}

async function save() {
  const saved = await form.submit()
  if (saved) {
    emit('saved', saved)
    open.value = false
  }
}

function pickReceipt(event: Event) {
  receipt.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

watch(open, (isOpen) => {
  if (!isOpen) return
  const expense = props.expense
  Object.assign(form.data, {
    description: expense?.description ?? '',
    expense_category_id: expense?.lines?.[0]?.expense_category_id ?? null,
    amount: expense?.amount ?? '',
    expense_date: expense?.expense_date ?? today(),
    payee_name: expense?.payee_name ?? '',
    paid_from: expense ? (expense.paid_from_account_id ?? NOT_PAID) : null,
    wht_amount: Number(expense?.wht_amount) ? expense?.wht_amount : '',
    reference: expense?.reference ?? '',
    resolution_reference: expense?.resolution_reference ?? '',
  })
  receipt.value = null
  if (fileInput.value) fileInput.value.value = ''
  form.errors.value = {}
  form.message.value = null
  void load().catch(() => {
    form.message.value = 'The form could not be loaded. Close it and try again.'
  })
})

const field = 'flex flex-col gap-1 text-sm font-medium'
const select = 'h-9 rounded-md border border-border bg-background px-3 text-sm font-normal'
const fieldError = 'text-xs font-normal text-destructive'
</script>

<template>
  <AppDrawer v-model:open="open" :title="editing ? 'Change expense' : 'Add expense'" :save-button-text="editing ? 'Save changes' : 'Save expense'" :loading="form.processing.value" @save="save">
    <div class="flex flex-col gap-4">
      <p v-if="form.message.value" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ form.message.value }}</p>
      <label :class="field">
        What was it for?
        <Input v-model="form.data.description" required maxlength="255" placeholder="Office rent for November" />
        <span v-if="form.error('description')" :class="fieldError">{{ form.error('description') }}</span>
      </label>
      <label :class="field">
        Category
        <select v-model="form.data.expense_category_id" required :class="select">
          <option :value="null" disabled>Choose a category</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
        </select>
        <span v-if="form.error('lines.0.expense_category_id')" :class="fieldError">Choose a category.</span>
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label :class="field">
          Amount (UGX)
          <Input v-model="form.data.amount" type="number" min="1" step="0.01" required class="tabular-nums" />
          <span v-if="form.error('lines.0.amount')" :class="fieldError">{{ form.error('lines.0.amount') }}</span>
        </label>
        <label :class="field">
          Date
          <Input v-model="form.data.expense_date" type="date" :max="today()" required />
          <span v-if="form.error('expense_date')" :class="fieldError">{{ form.error('expense_date') }}</span>
        </label>
      </div>
      <label :class="field">
        Paid to
        <Input v-model="form.data.payee_name" maxlength="255" placeholder="Person or business (optional)" />
      </label>
      <label :class="field">
        How was it paid?
        <select v-model="form.data.paid_from" :class="select">
          <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          <option :value="NOT_PAID">Not paid yet</option>
        </select>
      </label>
      <label v-if="needsResolution" :class="field">
        General meeting resolution
        <Input v-model="form.data.resolution_reference" required maxlength="100" placeholder="AGM/2026/07" />
        <span class="text-xs font-normal text-muted-foreground">Payments to board or committee members need one.</span>
      </label>
      <label :class="field">
        Receipt
        <input ref="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png" class="text-sm font-normal" @change="pickReceipt" />
        <span class="text-xs font-normal text-muted-foreground">Optional. A photo or PDF.</span>
      </label>
      <details class="rounded-md border border-border px-3 py-2">
        <summary class="cursor-pointer text-sm font-medium">More details</summary>
        <div class="mt-3 flex flex-col gap-4">
          <label :class="field">
            Tax withheld (UGX)
            <Input v-model="form.data.wht_amount" type="number" min="0" step="0.01" class="tabular-nums" />
            <span class="text-xs font-normal text-muted-foreground">Only if you held back tax for URA, such as 6% on a professional fee.</span>
          </label>
          <label :class="field">
            Reference
            <Input v-model="form.data.reference" maxlength="100" placeholder="Invoice or receipt number" />
          </label>
        </div>
      </details>
    </div>
  </AppDrawer>
</template>
