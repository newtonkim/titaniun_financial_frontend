<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import { Input } from '@/core/components/ui/input'
import { useForm } from '@/core/composables/useForm'
import { today } from '@/core/utils/format'
import { expenseCategoriesApi, expensesApi, recurringExpensesApi } from '../api'
import { FREQUENCIES } from '../labels'
import type { ExpenseCategory, RecurringExpense, RecurringFrequency } from '../types'

/** Set up a cost that comes round on a schedule. Nothing is paid until someone marks it paid. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ recurring: RecurringExpense | null }>()
const emit = defineEmits<{ saved: [] }>()

const categories = ref<ExpenseCategory[]>([])
const accounts = ref<{ id: number; name: string }[]>([])
const editing = computed(() => props.recurring !== null)

const form = useForm(
  { name: '', expense_category_id: null as number | null, amount: '', payee_name: '', paid_from_account_id: null as number | null, frequency: 'monthly' as RecurringFrequency, start_on: today(), end_on: '', is_active: true },
  (data) => {
    const payload = { ...data, amount: String(data.amount), payee_name: data.payee_name || null, end_on: data.end_on || null }
    return props.recurring ? recurringExpensesApi.update(props.recurring.id, payload) : recurringExpensesApi.create(payload)
  },
)

async function save() {
  if (await form.submit()) {
    emit('saved')
    open.value = false
  }
}

watch(open, (isOpen) => {
  if (!isOpen) return
  const recurring = props.recurring
  Object.assign(form.data, {
    name: recurring?.name ?? '',
    expense_category_id: recurring?.expense_category_id ?? null,
    amount: recurring?.amount ?? '',
    payee_name: recurring?.payee_name ?? '',
    paid_from_account_id: recurring?.paid_from_account_id ?? null,
    frequency: recurring?.frequency ?? 'monthly',
    start_on: recurring?.start_on ?? today(),
    end_on: recurring?.end_on ?? '',
    is_active: recurring ? recurring.is_active : true,
  })
  form.errors.value = {}
  form.message.value = null
  void Promise.all([expenseCategoriesApi.list({ per_page: 100 }), expensesApi.paymentAccounts()])
    .then(([loadedCategories, loadedAccounts]) => {
      categories.value = loadedCategories.data.filter((category) => category.is_active)
      accounts.value = loadedAccounts
    })
    .catch(() => {
      form.message.value = 'The form could not be loaded. Close it and try again.'
    })
})

const field = 'flex flex-col gap-1 text-sm font-medium'
const select = 'h-9 rounded-md border border-border bg-background px-3 text-sm font-normal'
const fieldError = 'text-xs font-normal text-destructive'
</script>

<template>
  <AppDrawer v-model:open="open" :title="editing ? 'Change recurring expense' : 'Add recurring expense'" :save-button-text="editing ? 'Save changes' : 'Add'" :loading="form.processing.value" @save="save">
    <div class="flex flex-col gap-4">
      <p v-if="form.message.value" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ form.message.value }}</p>
      <label :class="field">
        What is it?
        <Input v-model="form.data.name" required maxlength="255" placeholder="Office rent" />
        <span v-if="form.error('name')" :class="fieldError">{{ form.error('name') }}</span>
      </label>
      <label :class="field">
        Category
        <select v-model="form.data.expense_category_id" required :class="select">
          <option :value="null" disabled>Choose a category</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
        </select>
      </label>
      <label :class="field">
        Usual amount (UGX)
        <Input v-model="form.data.amount" type="number" min="1" step="0.01" required class="tabular-nums" />
        <span class="text-xs font-normal text-muted-foreground">If it changes, such as electricity, enter the real amount when you pay.</span>
        <span v-if="form.error('amount')" :class="fieldError">{{ form.error('amount') }}</span>
      </label>
      <label :class="field">
        How often?
        <select v-model="form.data.frequency" :class="select">
          <option v-for="frequency in FREQUENCIES" :key="frequency.value" :value="frequency.value">{{ frequency.label }}</option>
        </select>
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label :class="field">
          {{ editing ? 'Schedule starts' : 'First due date' }}
          <Input v-model="form.data.start_on" type="date" required />
          <span v-if="form.error('start_on')" :class="fieldError">{{ form.error('start_on') }}</span>
        </label>
        <label :class="field">
          Stops on
          <Input v-model="form.data.end_on" type="date" :min="form.data.start_on" />
          <span class="text-xs font-normal text-muted-foreground">Optional</span>
          <span v-if="form.error('end_on')" :class="fieldError">{{ form.error('end_on') }}</span>
        </label>
      </div>
      <label :class="field">
        Paid to
        <Input v-model="form.data.payee_name" maxlength="255" placeholder="Person or business (optional)" />
      </label>
      <label :class="field">
        Usually paid from
        <select v-model="form.data.paid_from_account_id" :class="select">
          <option :value="null">Ask each time</option>
          <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
        </select>
      </label>
      <label v-if="editing" class="flex items-center gap-2 text-sm font-normal"><input v-model="form.data.is_active" type="checkbox" /> Active. Untick to pause it.</label>
    </div>
  </AppDrawer>
</template>
